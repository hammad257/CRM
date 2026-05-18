import { ApiProperty } from '@nestjs/swagger';
import { Allow, IsUUID, ValidateIf } from 'class-validator';

export class AssignLeadDto {
  @ApiProperty({
    nullable: true,
    description: 'Active user id to own the lead, or null to unassign.',
  })
  @Allow()
  @ValidateIf((o: AssignLeadDto) => typeof o.ownerId === 'string')
  @IsUUID()
  ownerId!: string | null;
}
