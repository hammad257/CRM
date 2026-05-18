import {
  buildPaginationMeta,
  type PaginatedResult,
} from '../common/pagination/pagination';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users.query';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetUserRolesDto } from './dto/set-user-roles.dto';
import {
  userPublicSelect,
  type UserPublic,
} from './user-public.select';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserPublic> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userPublicSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async list(
    query: ListUsersQueryDto,
  ): Promise<PaginatedResult<UserPublic>> {
    const page = query.page != null && query.page >= 1 ? query.page : 1;
    const limit =
      query.limit != null && query.limit >= 1 && query.limit <= 100
        ? query.limit
        : 20;
    const where: Prisma.UserWhereInput = {};
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (query.status != null) {
      where.status = query.status;
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: userPublicSelect,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, meta: buildPaginationMeta(page, limit, total) };
  }

  async create(dto: CreateUserDto): Promise<UserPublic> {
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    try {
      return await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          avatarUrl: dto.avatarUrl ?? null,
          roles: dto.roleIds?.length
            ? { create: dto.roleIds.map((roleId) => ({ roleId })) }
            : undefined,
          scope: {
            create: { campusIds: [], departmentIds: [] },
          },
        },
        select: userPublicSelect,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Email already in use');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserPublic> {
    await this.ensureExists(id);
    const data: Prisma.UserUpdateInput = {};
    if (dto.email !== undefined) data.email = dto.email.toLowerCase();
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;
    if (dto.password !== undefined) {
      data.passwordHash = await argon2.hash(dto.password, {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });
    }
    if (dto.roleIds !== undefined) {
      data.roles = {
        deleteMany: {},
        create: dto.roleIds.map((roleId) => ({ roleId })),
      };
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        select: userPublicSelect,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Email already in use');
      }
      throw e;
    }
  }

  async updateMe(id: string, dto: UpdateMeDto): Promise<UserPublic> {
    return this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        avatarUrl: dto.avatarUrl,
      },
      select: userPublicSelect,
    });
  }

  /**
   * Setting status to anything other than ACTIVE revokes all refresh tokens
   * and bumps tokenVersion so outstanding access tokens stop working.
   */
  async setStatus(id: string, status: UserStatus): Promise<UserPublic> {
    await this.ensureExists(id);
    if (status === UserStatus.ACTIVE) {
      return this.prisma.user.update({
        where: { id },
        data: { status },
        select: userPublicSelect,
      });
    }
    await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({ where: { userId: id } }),
      this.prisma.user.update({
        where: { id },
        data: {
          status,
          tokenVersion: { increment: 1 },
        },
      }),
    ]);
    return this.findById(id);
  }

  async setRoles(id: string, dto: SetUserRolesDto): Promise<UserPublic> {
    await this.ensureExists(id);
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.userRole.createMany({
        data: dto.roleIds.map((roleId) => ({ userId: id, roleId })),
        skipDuplicates: true,
      }),
    ]);
    return this.findById(id);
  }

  private async ensureExists(id: string): Promise<void> {
    const n = await this.prisma.user.count({ where: { id } });
    if (!n) throw new NotFoundException('User not found');
  }
}
