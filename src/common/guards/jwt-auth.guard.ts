import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../constants';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  override handleRequest<TUser>(
    err: unknown,
    user: TUser,
    info: unknown,
  ): TUser {
    if (err || !user) {
      if (err) {
        if (err instanceof UnauthorizedException) throw err;
        const msg =
          err instanceof Error && err.message.trim()
            ? err.message
            : 'Authentication required';
        throw new UnauthorizedException(msg);
      }
      const message = JwtAuthGuard.describeAuthFailure(info);
      throw new UnauthorizedException(message);
    }
    return user;
  }

  /** Passport may pass `info` as a string, `{ message }`, or `{}` — avoid empty JSON bodies. */
  private static describeAuthFailure(info: unknown): string {
    if (info == null || info === false) return 'Authentication required';
    if (typeof info === 'string') {
      return info.trim() || 'Authentication required';
    }
    if (typeof info === 'object' && info !== null && 'message' in info) {
      const m = (info as { message?: unknown }).message;
      if (typeof m === 'string' && m.trim()) return m;
    }
    return 'Authentication required';
  }
}
