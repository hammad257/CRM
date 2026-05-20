import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import {
  buildPaginationMeta,
  type PaginatedResult,
} from '../common/pagination/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { ListTeamQueryDto } from './dto/list-team.query';
import { UpdateTeamScopeDto } from './dto/update-team-scope.dto';

const teamMemberSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  roles: {
    select: {
      role: { select: { id: true, code: true, name: true } },
    },
  },
  scope: {
    select: {
      campusIds: true,
      departmentIds: true,
    },
  },
  _count: {
    select: {
      ownedLeads: true,
      ownedDeals: true,
    },
  },
} satisfies Prisma.UserSelect;

export type TeamMember = Prisma.UserGetPayload<{
  select: typeof teamMemberSelect;
}>;

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: ListTeamQueryDto,
  ): Promise<PaginatedResult<TeamMember>> {
    const page = query.page != null && query.page >= 1 ? query.page : 1;
    const limit =
      query.limit != null && query.limit >= 1 && query.limit <= 100
        ? query.limit
        : 20;

    const where: Prisma.UserWhereInput = {
      status: query.status ?? UserStatus.ACTIVE,
    };

    if (query.roleCode?.trim()) {
      where.roles = {
        some: { role: { code: query.roleCode.trim() } },
      };
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: teamMemberSelect,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(page, limit, total) };
  }

  async updateScope(
    userId: string,
    dto: UpdateTeamScopeDto,
  ): Promise<TeamMember> {
    await this.ensureUserExists(userId);
    await this.prisma.userScope.upsert({
      where: { userId },
      create: {
        userId,
        campusIds: dto.campusIds,
        departmentIds: dto.departmentIds,
      },
      update: {
        campusIds: dto.campusIds,
        departmentIds: dto.departmentIds,
      },
    });
    const member = await this.prisma.user.findUnique({
      where: { id: userId },
      select: teamMemberSelect,
    });
    if (!member) throw new NotFoundException('User not found');
    return member;
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const n = await this.prisma.user.count({ where: { id: userId } });
    if (!n) throw new NotFoundException('User not found');
  }
}
