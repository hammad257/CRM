import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsUUID } from 'class-validator';

export class SetUserRolesDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    example: ['22222222-2222-2222-2222-222222222222'],
    description: 'Replaces all roles for the user.',
  })
  @ArrayNotEmpty()
  @IsUUID(undefined, { each: true })
  roleIds!: string[];
}
