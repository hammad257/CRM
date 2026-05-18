import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerHistoryType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddCustomerHistoryDto {
  @ApiPropertyOptional({
    enum: CustomerHistoryType,
    default: CustomerHistoryType.MANUAL,
  })
  @IsOptional()
  @IsEnum(CustomerHistoryType)
  type?: CustomerHistoryType;

  @ApiProperty({ example: 'Called — interested in demo next week.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  summary!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  detail?: string;
}
