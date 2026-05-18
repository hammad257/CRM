import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'Alex', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Johnson', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/avatars/me.png',
    maxLength: 2048,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string;
}
