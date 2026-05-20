import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateStageDto {
  @ApiProperty({ example: 'Proposal sent' })
  @IsString()
  @MaxLength(160)
  name: string;

  @ApiPropertyOptional({
    description: 'Order within the pipeline (lower = earlier).',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: '0–100; used for weighted forecast on OPEN deals in this stage.',
    default: 10,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  winProbability?: number;
}
