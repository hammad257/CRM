import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface EffectiveAccess {
  roleCodes: string[];
  permissionCodes: string[];
}

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getEffectiveAccess(userId: string): Promise<EffectiveAccess> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: {
          select: {
            role: {
              select: {
                code: true,
                permissions: {
                  select: {
                    permission: { select: { code: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return { roleCodes: [], permissionCodes: [] };
    }

    const roleCodes: string[] = [];
    const permissionCodes = new Set<string>();
    for (const ur of user.roles) {
      roleCodes.push(ur.role.code);
      for (const rp of ur.role.permissions) {
        permissionCodes.add(rp.permission.code);
      }
    }
    return { roleCodes, permissionCodes: [...permissionCodes] };
  }
}
