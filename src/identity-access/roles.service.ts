import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildPaginationMeta,
  type PaginatedResult,
} from '../common/pagination/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import type { ListRolesQueryDto } from './dto/list-roles.query';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

const roleDetailsSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
  permissions: {
    select: {
      permission: {
        select: {
          id: true,
          code: true,
          module: true,
          resource: true,
          action: true,
        },
      },
    },
  },
} satisfies Prisma.RoleSelect;

const roleListSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { users: true } },
} satisfies Prisma.RoleSelect;

type RoleListRow = Prisma.RoleGetPayload<{ select: typeof roleListSelect }>;

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: ListRolesQueryDto,
  ): Promise<PaginatedResult<RoleListRow>> {
    const page = query.page != null && query.page >= 1 ? query.page : 1;
    const limit =
      query.limit != null && query.limit >= 1 && query.limit <= 100
        ? query.limit
        : 20;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        orderBy: { code: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: roleListSelect,
      }),
      this.prisma.role.count(),
    ]);
    return { data, meta: buildPaginationMeta(page, limit, total) };
  }

  async getById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      select: roleDetailsSelect,
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(dto: CreateRoleDto) {
    try {
      return await this.prisma.role.create({
        data: {
          code: dto.code,
          name: dto.name,
          description: dto.description ?? null,
          isSystem: false,
        },
        select: roleDetailsSelect,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Role code already exists');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateRoleDto) {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Role not found');
    return this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
      },
      select: roleDetailsSelect,
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Role not found');
    if (existing.isSystem) {
      throw new ForbiddenException('System roles cannot be deleted');
    }
    const assigned = await this.prisma.userRole.count({
      where: { roleId: id },
    });
    if (assigned > 0) {
      throw new ConflictException('Role is assigned to users');
    }
    await this.prisma.role.delete({ where: { id } });
    return { ok: true as const };
  }

  async setPermissions(id: string, dto: SetRolePermissionsDto) {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Role not found');

    const permCount = await this.prisma.permission.count({
      where: { id: { in: dto.permissionIds } },
    });
    if (permCount !== dto.permissionIds.length) {
      throw new ConflictException('One or more permission ids are invalid');
    }

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({
          roleId: id,
          permissionId,
        })),
        skipDuplicates: true,
      }),
    ]);

    return this.getById(id);
  }
}
