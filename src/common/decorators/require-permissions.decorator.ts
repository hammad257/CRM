import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../constants';

export const RequirePermissions = (...codes: string[]) =>
  SetMetadata(PERMISSIONS_KEY, codes);
