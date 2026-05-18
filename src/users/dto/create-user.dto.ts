import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'alex@company.com', format: 'email' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Str0ng!Pass',
    minLength: 8,
    description: 'Minimum 8 characters; stored with Argon2id.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Alex', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  firstName!: string;

  @ApiProperty({ example: 'Johnson', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  lastName!: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/avatars/alex.png',
    maxLength: 2048,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    example: ['11111111-1111-1111-1111-111111111111'],
    description: 'Role IDs to assign on creation.',
  })
  @IsOptional()
  @IsUUID(undefined, { each: true })
  roleIds?: string[];
}
