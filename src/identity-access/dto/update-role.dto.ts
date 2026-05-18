import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Senior Support Agent' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    example: 'Escalation path + extended read access to finance invoices.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
