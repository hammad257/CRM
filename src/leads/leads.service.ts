import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import {
  buildPaginationMeta,
  type PaginatedResult,
} from '../common/pagination/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ListLeadsQueryDto } from './dto/list-leads.query';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { leadSelect, type LeadPublic } from './lead.select';

export type { LeadPublic };

const EXPORT_MAX = 5000;

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildListWhere(
    query: ListLeadsQueryDto,
  ): Prisma.LeadWhereInput {
    const where: Prisma.LeadWhereInput = {};
    if (query.status != null) where.status = query.status;
    if (query.source != null) where.source = query.source;
    if (query.ownerId != null) where.ownerId = query.ownerId;
    if (query.customerId != null) where.customerId = query.customerId;
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { companyName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async list(
    query: ListLeadsQueryDto,
  ): Promise<PaginatedResult<LeadPublic>> {
    const page = query.page != null && query.page >= 1 ? query.page : 1;
    const limit =
      query.limit != null && query.limit >= 1 && query.limit <= 100
        ? query.limit
        : 20;
    const where = this.buildListWhere(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ updatedAt: 'desc' }],
        select: leadSelect,
      }),
      this.prisma.lead.count({ where }),
    ]);
    return { data, meta: buildPaginationMeta(page, limit, total) };
  }

  async export(query: ListLeadsQueryDto): Promise<{ data: LeadPublic[] }> {
    const where = this.buildListWhere(query);
    const total = await this.prisma.lead.count({ where });
    if (total > EXPORT_MAX) {
      throw new BadRequestException(
        `Refine filters: export limited to ${EXPORT_MAX} rows (${total} matched).`,
      );
    }
    const data = await this.prisma.lead.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      take: EXPORT_MAX,
      select: leadSelect,
    });
    return { data };
  }

  async findById(id: string): Promise<LeadPublic> {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      select: leadSelect,
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async create(
    dto: CreateLeadDto,
    createdById: string,
  ): Promise<LeadPublic> {
    if (dto.customerId) {
      const c = await this.prisma.customer.count({
        where: { id: dto.customerId },
      });
      if (!c) throw new BadRequestException('Customer not found');
    }
    if (dto.ownerId) {
      await this.ensureActiveUser(dto.ownerId);
    }
    return this.prisma.lead.create({
      data: {
        title: dto.title,
        companyName: dto.companyName,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email?.toLowerCase() ?? null,
        phone: dto.phone,
        jobTitle: dto.jobTitle,
        status: dto.status,
        source: dto.source,
        estimatedValue:
          dto.estimatedValue != null
            ? new Prisma.Decimal(dto.estimatedValue)
            : undefined,
        customerId: dto.customerId,
        ownerId: dto.ownerId ?? createdById,
        createdById,
        description: dto.description,
        nextFollowUpAt: dto.nextFollowUpAt,
      },
      select: leadSelect,
    });
  }

  async update(id: string, dto: UpdateLeadDto): Promise<LeadPublic> {
    await this.ensureExists(id);
    return this.prisma.lead.update({
      where: { id },
      data: {
        title: dto.title,
        companyName: dto.companyName,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email:
          dto.email !== undefined
            ? dto.email?.toLowerCase() ?? null
            : undefined,
        phone: dto.phone,
        jobTitle: dto.jobTitle,
        status: dto.status,
        source: dto.source,
        estimatedValue:
          dto.estimatedValue !== undefined
            ? new Prisma.Decimal(dto.estimatedValue)
            : undefined,
        description: dto.description,
        nextFollowUpAt: dto.nextFollowUpAt,
      },
      select: leadSelect,
    });
  }

  async assign(id: string, dto: AssignLeadDto): Promise<LeadPublic> {
    if (dto.ownerId === undefined) {
      throw new BadRequestException(
        'ownerId is required in body (use null to unassign).',
      );
    }
    await this.ensureExists(id);
    if (dto.ownerId) {
      await this.ensureActiveUser(dto.ownerId);
    }
    return this.prisma.lead.update({
      where: { id },
      data: { ownerId: dto.ownerId },
      select: leadSelect,
    });
  }

  async remove(id: string): Promise<{ ok: true }> {
    await this.ensureExists(id);
    await this.prisma.lead.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureExists(id: string): Promise<void> {
    const n = await this.prisma.lead.count({ where: { id } });
    if (!n) throw new NotFoundException('Lead not found');
  }

  private async ensureActiveUser(userId: string): Promise<void> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    if (!u || u.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Invalid or inactive user for assignment');
    }
  }
}
