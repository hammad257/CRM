import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    example: 'SUPPORT_AGENT',
    description:
      'Unique role code in SCREAMING_SNAKE_CASE (letters, digits, underscore).',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'code must be SCREAMING_SNAKE_CASE',
  })
  @MaxLength(64)
  code!: string;

  @ApiProperty({ example: 'Support Agent', description: 'Human-readable name.' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    example: 'Handles tier-1 tickets and read-only CRM access.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
