import { Injectable } from '@nestjs/common';
import type { Permission, Prisma } from '@prisma/client';
import {
  buildPaginationMeta,
  type PaginatedResult,
} from '../common/pagination/pagination';
import { PrismaService } from '../prisma/prisma.service';
import type { ListPermissionsQueryDto } from './dto/list-permissions.query';

export interface GroupedPermissionItem {
  id: string;
  code: string;
  action: string;
  description: string | null;
}

export interface GroupedResource {
  resource: string;
  permissions: GroupedPermissionItem[];
}

export interface GroupedModule {
  module: string;
  resources: GroupedResource[];
}

export interface PermissionsGroupedResponse {
  modules: GroupedModule[];
  summary: {
    moduleCount: number;
    permissionCount: number;
  };
}

@Injectable()
export class PermissionsCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listFlat(
    query: ListPermissionsQueryDto,
  ): Promise<PaginatedResult<Permission>> {
    const page = query.page != null && query.page >= 1 ? query.page : 1;
    const limit =
      query.limit != null && query.limit >= 1 && query.limit <= 100
        ? query.limit
        : 20;
    const where: Prisma.PermissionWhereInput = {};
    if (query.module?.trim()) {
      where.module = query.module.trim();
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.permission.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ module: 'asc' }, { resource: 'asc' }, { action: 'asc' }],
      }),
      this.prisma.permission.count({ where }),
    ]);
    return { data, meta: buildPaginationMeta(page, limit, total) };
  }

  async listGrouped(): Promise<PermissionsGroupedResponse> {
    const rows = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { resource: 'asc' }, { action: 'asc' }],
    });
    const moduleMap = new Map<string, Map<string, GroupedPermissionItem[]>>();
    for (const row of rows) {
      if (!moduleMap.has(row.module)) {
        moduleMap.set(row.module, new Map());
      }
      const resMap = moduleMap.get(row.module)!;
      if (!resMap.has(row.resource)) {
        resMap.set(row.resource, []);
      }
      resMap.get(row.resource)!.push({
        id: row.id,
        code: row.code,
        action: row.action,
        description: row.description,
      });
    }
    const modules: GroupedModule[] = [...moduleMap.entries()].map(
      ([module, resMap]) => ({
        module,
        resources: [...resMap.entries()].map(([resource, permissions]) => ({
          resource,
          permissions,
        })),
      }),
    );
    return {
      modules,
      summary: {
        moduleCount: modules.length,
        permissionCount: rows.length,
      },
    };
  }
}
