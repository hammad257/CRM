import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomerHistoryType, Prisma, UserStatus } from '@prisma/client';
import { buildPaginationMeta } from '../common/pagination/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { leadSelect, type LeadPublic } from '../leads/lead.select';
import { AddCustomerHistoryDto } from './dto/add-customer-history.dto';
import { ListCustomersQueryDto } from './dto/list-customers.query';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { WebsiteInquiryDto } from './dto/website-inquiry.dto';

const EXPORT_MAX = 5000;

const historyInclude = {
  orderBy: { createdAt: 'desc' as const },
  include: {
    createdBy: {
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    },
    lead: {
      select: {
        id: true,
        title: true,
        status: true,
        source: true,
        createdAt: true,
      },
    },
  },
};

const leadSummarySelect = {
  id: true,
  title: true,
  status: true,
  source: true,
  createdAt: true,
  ownerId: true,
} satisfies Prisma.LeadSelect;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public: website form creates/updates customer + stores a Lead (WEBSITE).
   */
  async submitWebsiteInquiry(
    dto: WebsiteInquiryDto,
  ): Promise<{ customerId: string; leadId: string; lead: LeadPublic }> {
    const email = dto.email.trim().toLowerCase();

    return this.prisma.$transaction(async (tx) => {
      let customer = await tx.customer.findUnique({
        where: { primaryEmail: email },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            primaryEmail: email,
            phone: dto.phone?.trim() ?? null,
            companyName: dto.companyName?.trim() ?? null,
            industry: dto.industry?.trim() ?? null,
            website: dto.website?.trim() ?? null,
            jobTitle: dto.jobTitle?.trim() ?? null,
          },
        });
        await tx.customerHistory.create({
          data: {
            customerId: customer.id,
            type: CustomerHistoryType.PROFILE_CREATED,
            summary: 'Customer profile created from website inquiry',
          },
        });
      } else {
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            phone: dto.phone?.trim() ?? customer.phone,
            companyName: dto.companyName?.trim() ?? customer.companyName,
            industry: dto.industry?.trim() ?? customer.industry,
            website: dto.website?.trim() ?? customer.website,
            jobTitle: dto.jobTitle?.trim() ?? customer.jobTitle,
          },
        });
        await tx.customerHistory.create({
          data: {
            customerId: customer.id,
            type: CustomerHistoryType.WEB_INQUIRY,
            summary: 'Website inquiry — profile fields refreshed from form',
            detail: dto.message.slice(0, 2000),
          },
        });
      }

      const subject =
        dto.subject?.trim() ||
        `Website inquiry — ${dto.companyName?.trim() || email}`;

      const lead = await tx.lead.create({
        data: {
          title: subject,
          companyName: dto.companyName?.trim() ?? customer.companyName,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          email,
          phone: dto.phone?.trim() ?? null,
          jobTitle: dto.jobTitle?.trim() ?? null,
          source: 'WEBSITE',
          status: 'NEW',
          description: dto.message.trim(),
          customerId: customer.id,
          ownerId: null,
          createdById: null,
        },
        select: leadSelect,
      });

      await tx.customerHistory.create({
        data: {
          customerId: customer.id,
          type: CustomerHistoryType.LEAD_SUBMITTED,
          summary: `Lead captured: ${subject}`,
          detail: dto.message.trim(),
          leadId: lead.id,
        },
      });

      return { customerId: customer.id, leadId: lead.id, lead };
    });
  }

  private buildCustomerWhere(
    query: ListCustomersQueryDto,
  ): Prisma.CustomerWhereInput {
    const where: Prisma.CustomerWhereInput = {};
    if (query.status != null) where.status = query.status;
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { primaryEmail: { contains: q, mode: 'insensitive' } },
        { companyName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async list(query: ListCustomersQueryDto) {
    const page = query.page != null && query.page >= 1 ? query.page : 1;
    const limit =
      query.limit != null && query.limit >= 1 && query.limit <= 100
        ? query.limit
        : 20;
    const where = this.buildCustomerWhere(query);
    const listSelect = {
      id: true,
      status: true,
      firstName: true,
      lastName: true,
      displayName: true,
      primaryEmail: true,
      phone: true,
      companyName: true,
      industry: true,
      jobTitle: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { leads: true, history: true } },
    } satisfies Prisma.CustomerSelect;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ updatedAt: 'desc' }],
        select: listSelect,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { data, meta: buildPaginationMeta(page, limit, total) };
  }

  async export(query: ListCustomersQueryDto): Promise<{ data: unknown[] }> {
    const where = this.buildCustomerWhere(query);
    const total = await this.prisma.customer.count({ where });
    if (total > EXPORT_MAX) {
      throw new BadRequestException(
        `Refine filters: export limited to ${EXPORT_MAX} rows (${total} matched).`,
      );
    }
    const data = await this.prisma.customer.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      take: EXPORT_MAX,
      include: {
        history: { take: 5, orderBy: { createdAt: 'desc' } },
        _count: { select: { leads: true, history: true } },
      },
    });
    return { data };
  }

  async findByIdWithRelations(id: string) {
    const row = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        linkedUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
        history: historyInclude,
        leads: {
          orderBy: { createdAt: 'desc' },
          select: leadSummarySelect,
        },
      },
    });
    if (!row) throw new NotFoundException('Customer not found');
    return row;
  }

  async update(
    id: string,
    dto: UpdateCustomerDto,
    actorId: string,
  ): Promise<unknown> {
    await this.ensureCustomerExists(id);
    if (dto.linkedUserId !== undefined && dto.linkedUserId !== null) {
      const u = await this.prisma.user.findUnique({
        where: { id: dto.linkedUserId },
        select: { status: true },
      });
      if (!u || u.status !== UserStatus.ACTIVE) {
        throw new BadRequestException('Invalid or inactive user to link');
      }
      const taken = await this.prisma.customer.findUnique({
        where: { linkedUserId: dto.linkedUserId },
        select: { id: true },
      });
      if (taken && taken.id !== id) {
        throw new BadRequestException('That user is already linked to another customer');
      }
    }
    const {
      primaryEmail: nextEmail,
      linkedUserId,
      ...rest
    } = dto;
    const data: Prisma.CustomerUpdateInput = { ...rest };
    if (nextEmail !== undefined) {
      const e = nextEmail.trim().toLowerCase();
      const clash = await this.prisma.customer.findFirst({
        where: { primaryEmail: e, NOT: { id } },
        select: { id: true },
      });
      if (clash) throw new BadRequestException('primaryEmail already in use');
      data.primaryEmail = e;
    }
    if (linkedUserId !== undefined) {
      if (linkedUserId === null) {
        data.linkedUser = { disconnect: true };
      } else {
        data.linkedUser = { connect: { id: linkedUserId } };
      }
    }
    await this.prisma.customer.update({
      where: { id },
      data,
    });
    await this.prisma.customerHistory.create({
      data: {
        customerId: id,
        type: CustomerHistoryType.PROFILE_UPDATED,
        summary: 'Customer record updated by staff',
        createdById: actorId,
      },
    });
    return this.findByIdWithRelations(id);
  }

  async addHistory(
    id: string,
    dto: AddCustomerHistoryDto,
    actorId: string,
  ): Promise<unknown> {
    await this.ensureCustomerExists(id);
    await this.prisma.customerHistory.create({
      data: {
        customerId: id,
        type: dto.type ?? CustomerHistoryType.MANUAL,
        summary: dto.summary,
        detail: dto.detail,
        createdById: actorId,
      },
    });
    return this.findByIdWithRelations(id);
  }

  async remove(id: string): Promise<{ ok: true }> {
    await this.ensureCustomerExists(id);
    await this.prisma.customer.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureCustomerExists(id: string): Promise<void> {
    const n = await this.prisma.customer.count({ where: { id } });
    if (!n) throw new NotFoundException('Customer not found');
  }
}
