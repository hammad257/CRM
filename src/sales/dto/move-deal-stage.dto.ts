import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MoveDealStageDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  stageId: string;
}
