import { ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListCustomersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'acme',
    description: 'Search name, email, company.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CustomerStatus })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;
}
