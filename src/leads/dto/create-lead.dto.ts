import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadSource, LeadStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLeadDto {
  @ApiPropertyOptional({ example: 'Acme RFP — Q2 expansion' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: 'Acme Corp' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @ApiProperty({ example: 'Jamie' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  firstName!: string;

  @ApiProperty({ example: 'Rivera' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  lastName!: string;

  @ApiPropertyOptional({ example: 'jamie@acme.example' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '+1 555 010 2030' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ example: 'Procurement Lead' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string;

  @ApiPropertyOptional({ enum: LeadStatus, example: LeadStatus.NEW })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional({ enum: LeadSource, example: LeadSource.WEBSITE })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @ApiPropertyOptional({
    example: 25000,
    description: 'Estimated opportunity value (major units).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1e12)
  estimatedValue?: number;

  @ApiPropertyOptional({ description: 'Defaults to authenticated user if omitted.' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ example: 'Met at SaaStr; follow up on pilot scope.' })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2026-05-20T14:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  nextFollowUpAt?: Date;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Link lead to an existing customer profile.',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;
}
