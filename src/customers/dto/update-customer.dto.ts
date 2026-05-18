import { ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerStatus } from '@prisma/client';
import { Allow, IsEnum, IsOptional, IsString, IsUUID, ValidateIf, MaxLength } from 'class-validator';

export class UpdateCustomerDto {
  @ApiPropertyOptional({ enum: CustomerStatus })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @ApiPropertyOptional({ format: 'email' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  primaryEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ format: 'email' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  secondaryEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  industry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  website?: string;

  @ApiPropertyOptional({ example: '51-200' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  companySize?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  profileNotes?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Link to internal user, or null to remove link.',
  })
  @Allow()
  @ValidateIf((_, v) => v != null && typeof v === 'string')
  @IsUUID()
  linkedUserId?: string | null;
}
