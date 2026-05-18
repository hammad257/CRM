import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsUUID } from 'class-validator';

export class SetRolePermissionsDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    example: [
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    ],
    description: 'Permission IDs to grant to this role (replaces existing grants).',
  })
  @ArrayNotEmpty()
  @IsUUID(undefined, { each: true })
  permissionIds!: string[];
}
