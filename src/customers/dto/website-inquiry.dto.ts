import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Public website form — no authentication.
 * Creates/updates a customer profile and a Lead (source WEBSITE).
 */
export class WebsiteInquiryDto {
  @ApiProperty({ example: 'Jamie' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  firstName!: string;

  @ApiProperty({ example: 'Nguyen' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  lastName!: string;

  @ApiProperty({ example: 'jamie@company.example', format: 'email' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({ example: '+1 555 010 8877' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ example: 'Acme Industries' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @ApiPropertyOptional({ example: 'Manufacturing' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  industry?: string;

  @ApiPropertyOptional({ example: 'https://acme.example' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  website?: string;

  @ApiPropertyOptional({ example: 'Head of IT' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string;

  @ApiPropertyOptional({
    example: 'Question about enterprise pricing',
    description: 'Short subject line for the lead.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @ApiProperty({
    example: 'We are evaluating CRM for ~200 users and need SSO + reporting.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  message!: string;
}
