import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DealStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { PipelineBoardQueryDto } from './dto/pipeline-board.query';
import { UpdateStageDto } from './dto/update-stage.dto';
import { dealSelect, type DealPublic } from './deal.select';

const pipelineDetailSelect = {
  id: true,
  name: true,
  description: true,
  isDefault: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  stages: {
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] as const,
    select: {
      id: true,
      name: true,
      sortOrder: true,
      winProbability: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.PipelineSelect;

export type PipelineDetail = Prisma.PipelineGetPayload<{
  select: typeof pipelineDetailSelect;
}>;

@Injectable()
export class PipelinesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<PipelineDetail[]> {
    return this.prisma.pipeline.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: pipelineDetailSelect,
    });
  }

  async findById(id: string): Promise<PipelineDetail> {
    const row = await this.prisma.pipeline.findUnique({
      where: { id },
      select: pipelineDetailSelect,
    });
    if (!row) throw new NotFoundException('Pipeline not found');
    return row;
  }

  async getBoard(
    pipelineId: string,
    query: PipelineBoardQueryDto,
  ): Promise<{
    pipeline: PipelineDetail;
    status: DealStatus;
    stages: Array<{
      stage: PipelineDetail['stages'][number];
      deals: DealPublic[];
    }>;
  }> {
    const pipeline = await this.findById(pipelineId);
    const status = query.status ?? DealStatus.OPEN;
    const dealWhere: Prisma.DealWhereInput = {
      status,
      stage: { pipelineId },
    };
    if (query.ownerId != null) dealWhere.ownerId = query.ownerId;

    const deals = await this.prisma.deal.findMany({
      where: dealWhere,
      orderBy: [{ updatedAt: 'desc' }],
      select: dealSelect,
    });

    const byStage = new Map<string, DealPublic[]>();
    for (const stage of pipeline.stages) {
      byStage.set(stage.id, []);
    }
    for (const deal of deals) {
      const bucket = byStage.get(deal.stageId);
      if (bucket) bucket.push(deal);
    }

    return {
      pipeline,
      status,
      stages: pipeline.stages.map((stage) => ({
        stage,
        deals: byStage.get(stage.id) ?? [],
      })),
    };
  }

  async create(dto: CreatePipelineDto): Promise<PipelineDetail> {
    const isDefault = dto.isDefault ?? false;
    return this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.pipeline.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.pipeline.create({
        data: {
          name: dto.name,
          description: dto.description,
          isDefault,
          sortOrder: dto.sortOrder ?? 0,
        },
        select: pipelineDetailSelect,
      });
    });
  }

  async update(id: string, dto: UpdatePipelineDto): Promise<PipelineDetail> {
    await this.findById(id);
    if (dto.isDefault === true) {
      return this.prisma.$transaction(async (tx) => {
        await tx.pipeline.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
        return tx.pipeline.update({
          where: { id },
          data: {
            name: dto.name,
            description: dto.description,
            isDefault: true,
            sortOrder: dto.sortOrder,
          },
          select: pipelineDetailSelect,
        });
      });
    }
    return this.prisma.pipeline.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        sortOrder: dto.sortOrder,
      },
      select: pipelineDetailSelect,
    });
  }

  async remove(id: string): Promise<{ ok: true }> {
    await this.findById(id);
    const dealCount = await this.prisma.deal.count({
      where: { stage: { pipelineId: id } },
    });
    if (dealCount > 0) {
      throw new ConflictException(
        'Cannot delete a pipeline that still has deals in its stages.',
      );
    }
    await this.prisma.pipeline.delete({ where: { id } });
    return { ok: true };
  }

  async createStage(
    pipelineId: string,
    dto: CreateStageDto,
  ): Promise<PipelineDetail> {
    await this.findById(pipelineId);
    await this.prisma.pipelineStage.create({
      data: {
        pipelineId,
        name: dto.name,
        sortOrder: dto.sortOrder ?? 0,
        winProbability: dto.winProbability ?? 10,
      },
    });
    return this.findById(pipelineId);
  }

  async updateStage(
    stageId: string,
    dto: UpdateStageDto,
  ): Promise<PipelineDetail> {
    const stage = await this.prisma.pipelineStage.findUnique({
      where: { id: stageId },
      select: { pipelineId: true },
    });
    if (!stage) throw new NotFoundException('Stage not found');
    await this.prisma.pipelineStage.update({
      where: { id: stageId },
      data: {
        name: dto.name,
        sortOrder: dto.sortOrder,
        winProbability: dto.winProbability,
      },
    });
    return this.findById(stage.pipelineId);
  }

  async removeStage(stageId: string): Promise<PipelineDetail> {
    const stage = await this.prisma.pipelineStage.findUnique({
      where: { id: stageId },
      select: { pipelineId: true },
    });
    if (!stage) throw new NotFoundException('Stage not found');
    const dealCount = await this.prisma.deal.count({
      where: { stageId },
    });
    if (dealCount > 0) {
      throw new ConflictException(
        'Cannot delete a stage that still has deals. Move deals first.',
      );
    }
    await this.prisma.pipelineStage.delete({ where: { id: stageId } });
    return this.findById(stage.pipelineId);
  }
}
