import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from '../constants';
import { AccessService } from '../../identity-access/access.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: AccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndMerge<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const req = context.switchToHttp().getRequest<{ user?: { id: string } }>();
    const userId = req.user?.id;
    if (!userId) return false;

    const { permissionCodes, roleCodes } =
      await this.access.getEffectiveAccess(userId);
    if (roleCodes.includes('SUPER_ADMIN')) return true;

    const granted = new Set(permissionCodes);
    const missing = required.filter((code) => !granted.has(code));
    if (missing.length > 0) {
      throw new ForbiddenException({
        message: 'Insufficient permissions',
        missing,
      });
    }
    return true;
  }
}
