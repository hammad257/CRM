import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsUUID } from 'class-validator';

/**
 * Weighted pipeline forecast uses OPEN deals only: sum(amount × stage.winProbability / 100).
 */
export class ForecastDealsQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Restrict to deals whose stage belongs to this pipeline.',
  })
  @IsOptional()
  @IsUUID()
  pipelineId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({
    description: 'Include only deals with expectedCloseDate >= this (ISO date).',
  })
  @IsOptional()
  @Type(() => Date)
  expectedCloseFrom?: Date;

  @ApiPropertyOptional({
    description: 'Include only deals with expectedCloseDate <= this (ISO date).',
  })
  @IsOptional()
  @Type(() => Date)
  expectedCloseTo?: Date;
}
