import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class UpdateTeamScopeDto {
  @ApiProperty({
    type: [String],
    example: ['campus-north'],
    description: 'Campus identifiers this user may access.',
  })
  @IsArray()
  @IsString({ each: true })
  campusIds!: string[];

  @ApiProperty({
    type: [String],
    example: ['sales'],
    description: 'Department identifiers this user belongs to.',
  })
  @IsArray()
  @IsString({ each: true })
  departmentIds!: string[];
}
