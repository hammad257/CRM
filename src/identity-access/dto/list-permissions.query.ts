import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListPermissionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'identity',
    description: 'Filter permissions by module key.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  module?: string;
}
