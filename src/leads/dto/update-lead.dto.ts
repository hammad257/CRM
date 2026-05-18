import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateLeadDto } from './create-lead.dto';

/** Update payload — `ownerId` changes use `PATCH .../assign`. */
export class UpdateLeadDto extends PartialType(
  OmitType(CreateLeadDto, ['ownerId'] as const),
) {}
