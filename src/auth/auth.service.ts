import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { userPublicSelect, type UserPublic } from '../users/user-public.select';
import type { JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private get accessExpiresSeconds(): number {
    const raw = this.config.get<string>('JWT_ACCESS_EXPIRES_SEC');
    const n = raw !== undefined && raw !== '' ? Number(raw) : NaN;
    if (Number.isFinite(n) && n > 0) return n;
    return 900;
  }

  private get refreshTtlMs(): number {
    const raw = this.config.get<string>('JWT_REFRESH_EXPIRES_DAYS') ?? '7';
    const days = Number(raw);
    return (Number.isFinite(days) ? days : 7) * 24 * 60 * 60 * 1000;
  }

  private hashRefresh(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  async login(
    email: string,
    password: string,
    meta: { userAgent?: string; ipAddress?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        tokenVersion: true,
        status: true,
      },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.tokenVersion,
      meta,
    );
    const profile = await this.loadUserPublic(user.id);
    return { ...tokens, user: profile };
  }

  async refresh(
    refreshToken: string,
    meta: { userAgent?: string; ipAddress?: string },
  ) {
    const tokenHash = this.hashRefresh(refreshToken);
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (
      !row ||
      row.revokedAt ||
      row.expiresAt <= new Date() ||
      row.user.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(
      row.user.id,
      row.user.email,
      row.user.tokenVersion,
      meta,
    );
    const profile = await this.loadUserPublic(row.user.id);
    return { ...tokens, user: profile };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashRefresh(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      }),
    ]);
  }

  private async loadUserPublic(userId: string): Promise<UserPublic> {
    const profile = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userPublicSelect,
    });
    if (!profile) {
      throw new UnauthorizedException('User not found');
    }
    return profile;
  }

  private async issueTokens(
    userId: string,
    email: string,
    tokenVersion: number,
    meta: { userAgent?: string; ipAddress?: string },
  ) {
    const payload: JwtPayload = {
      sub: userId,
      email,
      tv: tokenVersion,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.accessExpiresSeconds,
    });

    const rawRefresh = randomBytes(48).toString('base64url');
    const tokenHash = this.hashRefresh(rawRefresh);
    const expiresAt = new Date(Date.now() + this.refreshTtlMs);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        userAgent: meta.userAgent ?? null,
        ipAddress: meta.ipAddress ?? null,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      tokenType: 'Bearer' as const,
      expiresIn: this.accessExpiresSeconds,
    };
  }
}
