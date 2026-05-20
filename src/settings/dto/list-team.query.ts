import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListTeamQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'SALES_REP',
    description: 'Filter members who have this role code.',
  })
  @IsOptional()
  @IsString()
  roleCode?: string;

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    example: 'alex',
    description: 'Search name or email.',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
