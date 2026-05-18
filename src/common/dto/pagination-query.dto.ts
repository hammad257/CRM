import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Shared query for offset pagination (page + limit).
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({
    minimum: 1,
    default: 1,
    example: 1,
    description: 'Page number (1-based).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
    description: 'Items per page (max 100).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
