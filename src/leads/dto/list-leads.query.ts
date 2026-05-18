import { ApiPropertyOptional } from '@nestjs/swagger';
import { LeadSource, LeadStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListLeadsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'acme',
    description: 'Search first name, last name, email, company, phone.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional({ enum: LeadSource })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filter by assigned owner.',
  })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filter by linked customer.',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;
}
