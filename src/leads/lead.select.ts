import { Prisma } from '@prisma/client';

export const leadSelect = {
  id: true,
  title: true,
  companyName: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  jobTitle: true,
  status: true,
  source: true,
  estimatedValue: true,
  description: true,
  nextFollowUpAt: true,
  customerId: true,
  ownerId: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  customer: {
    select: {
      id: true,
      primaryEmail: true,
      firstName: true,
      lastName: true,
      companyName: true,
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
  createdBy: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.LeadSelect;

export type LeadPublic = Prisma.LeadGetPayload<{ select: typeof leadSelect }>;
