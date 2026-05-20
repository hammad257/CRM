import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DealStatus, LeadStatus, Prisma, UserStatus } from '@prisma/client';
import {
  buildPaginationMeta,
  type PaginatedResult,
} from '../common/pagination/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { dealSelect, type DealPublic } from './deal.select';
import { ConvertLeadToDealDto } from './dto/convert-lead-to-deal.dto';
import { CreateDealDto } from './dto/create-deal.dto';
import { ForecastDealsQueryDto } from './dto/forecast-deals.query';
import { ListDealsQueryDto } from './dto/list-deals.query';
import { UpdateDealDto } from './dto/update-deal.dto';
import { LeadCustomerConversionService } from './lead-customer-conversion.service';

export type { DealPublic };

export interface ForecastStageBreakdown {
  stageId: string;
  stageName: string;
  stageSortOrder: number;
  winProbability: number;
  pipelineId: string;
  pipelineName: string;
  dealCount: number;
  totalAmount: number;
  weightedAmount: number;
}

export interface ForecastByCurrency {
  currency: string;
  totalAmount: number;
  weightedPipelineValue: number;
}

export interface DealForecastResult {
  status: DealStatus;
  filters: ForecastDealsQueryDto;
  totalOpenDeals: number;
  /** Sum of amounts (missing amounts treated as 0). */
  totalOpenAmount: number;
  /** Sum(amount × winProbability / 100) per stage, then summed. */
  weightedPipelineValue: number;
  byCurrency: ForecastByCurrency[];
  byStage: ForecastStageBreakdown[];
}

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadConversion: LeadCustomerConversionService,
  ) {}

  private buildListWhere(query: ListDealsQueryDto): Prisma.DealWhereInput {
    const where: Prisma.DealWhereInput = {};
    if (query.status != null) where.status = query.status;
    if (query.ownerId != null) where.ownerId = query.ownerId;
    if (query.customerId != null) where.customerId = query.customerId;
    if (query.leadId != null) where.leadId = query.leadId;
    if (query.stageId != null) where.stageId = query.stageId;
    if (query.pipelineId != null) {
      where.stage = { pipelineId: query.pipelineId };
    }
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async list(
    query: ListDealsQueryDto,
  ): Promise<PaginatedResult<DealPublic>> {
    const page = query.page != null && query.page >= 1 ? query.page : 1;
    const limit =
      query.limit != null && query.limit >= 1 && query.limit <= 100
        ? query.limit
        : 20;
    const where = this.buildListWhere(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.deal.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ updatedAt: 'desc' }],
        select: dealSelect,
      }),
      this.prisma.deal.count({ where }),
    ]);
    return { data, meta: buildPaginationMeta(page, limit, total) };
  }

  async forecast(query: ForecastDealsQueryDto): Promise<DealForecastResult> {
    const where: Prisma.DealWhereInput = {
      status: DealStatus.OPEN,
    };
    if (query.pipelineId != null) {
      where.stage = { pipelineId: query.pipelineId };
    }
    if (query.ownerId != null) where.ownerId = query.ownerId;
    if (query.expectedCloseFrom != null || query.expectedCloseTo != null) {
      where.expectedCloseDate = {};
      if (query.expectedCloseFrom != null) {
        where.expectedCloseDate.gte = query.expectedCloseFrom;
      }
      if (query.expectedCloseTo != null) {
        where.expectedCloseDate.lte = query.expectedCloseTo;
      }
    }

    const deals = await this.prisma.deal.findMany({
      where,
      select: {
        amount: true,
        currency: true,
        stage: {
          select: {
            id: true,
            name: true,
            sortOrder: true,
            winProbability: true,
            pipeline: { select: { id: true, name: true } },
          },
        },
      },
    });

    const stageMap = new Map<string, ForecastStageBreakdown>();
    let totalOpenAmount = 0;
    let weightedPipelineValue = 0;
    const currencyMap = new Map<
      string,
      { totalAmount: number; weighted: number }
    >();

    for (const d of deals) {
      const raw = d.amount != null ? Number(d.amount) : 0;
      const prob = Math.min(
        100,
        Math.max(0, d.stage.winProbability),
      );
      const w = raw * (prob / 100);
      totalOpenAmount += raw;
      weightedPipelineValue += w;

      const cur = (d.currency ?? 'USD').toUpperCase();
      const agg = currencyMap.get(cur) ?? { totalAmount: 0, weighted: 0 };
      agg.totalAmount += raw;
      agg.weighted += w;
      currencyMap.set(cur, agg);

      const sid = d.stage.id;
      let sb = stageMap.get(sid);
      if (!sb) {
        sb = {
          stageId: d.stage.id,
          stageName: d.stage.name,
          stageSortOrder: d.stage.sortOrder,
          winProbability: d.stage.winProbability,
          pipelineId: d.stage.pipeline.id,
          pipelineName: d.stage.pipeline.name,
          dealCount: 0,
          totalAmount: 0,
          weightedAmount: 0,
        };
        stageMap.set(sid, sb);
      }
      sb.dealCount += 1;
      sb.totalAmount += raw;
      sb.weightedAmount += w;
    }

    const byStage = [...stageMap.values()].sort((a, b) => {
      if (a.pipelineName !== b.pipelineName) {
        return a.pipelineName.localeCompare(b.pipelineName);
      }
      if (a.stageSortOrder !== b.stageSortOrder) {
        return a.stageSortOrder - b.stageSortOrder;
      }
      return a.stageName.localeCompare(b.stageName);
    });

    const byCurrency: ForecastByCurrency[] = [...currencyMap.entries()].map(
      ([currency, v]) => ({
        currency,
        totalAmount: v.totalAmount,
        weightedPipelineValue: v.weighted,
      }),
    );

    return {
      status: DealStatus.OPEN,
      filters: query,
      totalOpenDeals: deals.length,
      totalOpenAmount,
      weightedPipelineValue,
      byCurrency,
      byStage,
    };
  }

  async findById(id: string): Promise<DealPublic> {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      select: dealSelect,
    });
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  async create(
    dto: CreateDealDto,
    createdById: string,
  ): Promise<DealPublic> {
    await this.ensureStageExists(dto.stageId);
    if (dto.ownerId) await this.ensureActiveUser(dto.ownerId);
    if (dto.customerId) await this.ensureCustomerExists(dto.customerId);
    if (dto.leadId) {
      const dup = await this.prisma.deal.findUnique({
        where: { leadId: dto.leadId },
        select: { id: true },
      });
      if (dup) {
        throw new ConflictException('A deal already exists for this lead');
      }
      const lead = await this.prisma.lead.count({
        where: { id: dto.leadId },
      });
      if (!lead) throw new BadRequestException('Lead not found');
    }

    const currency = (dto.currency ?? 'USD').toUpperCase().slice(0, 3);

    return this.prisma.deal.create({
      data: {
        title: dto.title,
        amount:
          dto.amount != null ? new Prisma.Decimal(dto.amount) : undefined,
        currency,
        status: dto.status ?? DealStatus.OPEN,
        stageId: dto.stageId,
        ownerId: dto.ownerId ?? createdById,
        customerId: dto.customerId,
        leadId: dto.leadId,
        expectedCloseDate: dto.expectedCloseDate,
        description: dto.description,
        createdById,
      },
      select: dealSelect,
    });
  }

  async createFromLead(
    leadId: string,
    dto: ConvertLeadToDealDto,
    createdById: string,
  ): Promise<DealPublic> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        deal: { select: { id: true } },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.deal) {
      throw new ConflictException('This lead is already linked to a deal');
    }

    const stageId = dto.stageId ?? (await this.resolveDefaultFirstStageId());
    await this.ensureStageExists(stageId);

    const titleFromParts =
      `${lead.firstName} ${lead.lastName}`.trim() ||
      lead.companyName ||
      'Opportunity';
    const title = (dto.title ?? lead.title ?? titleFromParts).trim();

    const amount =
      dto.amount != null
        ? new Prisma.Decimal(dto.amount)
        : lead.estimatedValue != null
          ? lead.estimatedValue
          : undefined;

    return this.prisma.$transaction(async (tx) => {
      const deal = await tx.deal.create({
        data: {
          title,
          amount,
          currency: 'USD',
          status: DealStatus.OPEN,
          stageId,
          ownerId: lead.ownerId ?? createdById,
          customerId: lead.customerId,
          leadId: lead.id,
          expectedCloseDate: dto.expectedCloseDate ?? lead.nextFollowUpAt,
          description: dto.description ?? lead.description,
          createdById,
        },
        select: dealSelect,
      });
      await tx.lead.update({
        where: { id: leadId },
        data: { status: LeadStatus.NEGOTIATION },
      });
      return deal;
    });
  }

  async update(
    id: string,
    dto: UpdateDealDto,
    actorId?: string,
  ): Promise<DealPublic> {
    const existing = await this.prisma.deal.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!existing) throw new NotFoundException('Deal not found');

    if (dto.stageId) await this.ensureStageExists(dto.stageId);
    if (dto.ownerId) await this.ensureActiveUser(dto.ownerId);
    if (dto.customerId) await this.ensureCustomerExists(dto.customerId);

    const closing =
      dto.status === DealStatus.WON || dto.status === DealStatus.LOST;
    const actualCloseDate =
      dto.actualCloseDate ??
      (closing ? new Date() : undefined);

    const finalizeWon = this.leadConversion.shouldFinalizeWon(
      existing.status,
      dto.status,
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.deal.update({
        where: { id },
        data: {
          title: dto.title,
          amount:
            dto.amount !== undefined
              ? new Prisma.Decimal(dto.amount)
              : undefined,
          currency:
            dto.currency !== undefined
              ? dto.currency.toUpperCase().slice(0, 3)
              : undefined,
          status: dto.status,
          stageId: dto.stageId,
          ownerId: dto.ownerId,
          customerId: dto.customerId,
          expectedCloseDate: dto.expectedCloseDate,
          actualCloseDate,
          description: dto.description,
        },
      });

      if (finalizeWon) {
        await this.leadConversion.finalizeWonDeal(tx, id, actorId);
      }

      const deal = await tx.deal.findUnique({
        where: { id },
        select: dealSelect,
      });
      if (!deal) throw new NotFoundException('Deal not found');
      return deal;
    });
  }

  async moveStage(id: string, stageId: string): Promise<DealPublic> {
    await this.ensureDealExists(id);
    await this.ensureStageExists(stageId);
    return this.prisma.deal.update({
      where: { id },
      data: { stageId },
      select: dealSelect,
    });
  }

  async remove(id: string): Promise<{ ok: true }> {
    await this.ensureDealExists(id);
    await this.prisma.deal.delete({ where: { id } });
    return { ok: true };
  }

  private async resolveDefaultFirstStageId(): Promise<string> {
    const defaultPipeline = await this.prisma.pipeline.findFirst({
      where: { isDefault: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        stages: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          take: 1,
          select: { id: true },
        },
      },
    });
    const fromDefault = defaultPipeline?.stages[0]?.id;
    if (fromDefault) return fromDefault;

    const anyStage = await this.prisma.pipelineStage.findFirst({
      orderBy: [
        { pipeline: { sortOrder: 'asc' } },
        { pipeline: { name: 'asc' } },
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
      select: { id: true },
    });
    if (!anyStage) {
      throw new BadRequestException(
        'No pipeline stages exist. Create a pipeline with stages first.',
      );
    }
    return anyStage.id;
  }

  private async ensureDealExists(id: string): Promise<void> {
    const n = await this.prisma.deal.count({ where: { id } });
    if (!n) throw new NotFoundException('Deal not found');
  }

  private async ensureStageExists(stageId: string): Promise<void> {
    const n = await this.prisma.pipelineStage.count({ where: { id: stageId } });
    if (!n) throw new BadRequestException('Pipeline stage not found');
  }

  private async ensureCustomerExists(customerId: string): Promise<void> {
    const n = await this.prisma.customer.count({ where: { id: customerId } });
    if (!n) throw new BadRequestException('Customer not found');
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
