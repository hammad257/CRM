import { Prisma } from '@prisma/client';

export const dealSelect = {
  id: true,
  title: true,
  amount: true,
  currency: true,
  status: true,
  stageId: true,
  ownerId: true,
  customerId: true,
  leadId: true,
  expectedCloseDate: true,
  actualCloseDate: true,
  description: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  stage: {
    select: {
      id: true,
      name: true,
      sortOrder: true,
      winProbability: true,
      pipeline: {
        select: {
          id: true,
          name: true,
          isDefault: true,
        },
      },
    },
  },
  owner: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
  customer: {
    select: {
      id: true,
      primaryEmail: true,
      firstName: true,
      lastName: true,
      companyName: true,
    },
  },
  lead: {
    select: {
      id: true,
      title: true,
      firstName: true,
      lastName: true,
      companyName: true,
      status: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.DealSelect;

export type DealPublic = Prisma.DealGetPayload<{ select: typeof dealSelect }>;
