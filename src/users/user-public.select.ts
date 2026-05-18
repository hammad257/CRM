import { Prisma } from '@prisma/client';

/** Safe fields + roles + scope for API responses (no secrets). */
export const userPublicSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
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
} satisfies Prisma.UserSelect;

export type UserPublic = Prisma.UserGetPayload<{ select: typeof userPublicSelect }>;
