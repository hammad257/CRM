import { ApiPropertyOptional } from '@nestjs/swagger';
import { DealStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class PipelineBoardQueryDto {
  @ApiPropertyOptional({
    enum: DealStatus,
    default: DealStatus.OPEN,
    description: 'Filter deals on the board by status.',
  })
  @IsOptional()
  @IsEnum(DealStatus)
  status?: DealStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
