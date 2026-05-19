import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserStatus } from '@prisma/client';

const GLOBAL_STATE_ID = 'global';

export interface InboundAssignee {
  userId: string;
  label: string;
}

@Injectable()
export class LeadAssignmentService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Comma-separated role `code` values (e.g. SALES_REP).
   * Defaults to SALES_REP so seed roles match.
   */
  private assignableRoleCodes(): string[] {
    const raw =
      this.config.get<string>('INBOUND_LEAD_ASSIGN_ROLE_CODES') ?? 'SALES_REP';
    const codes = raw
      .split(/[,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return [...new Set(codes)];
  }

  /**
   * Round-robin among ACTIVE users having any of the configured roles.
   * Run inside the same `prisma.$transaction` as lead creation.
   */
  async pickNextOwnerForInbound(
    tx: Prisma.TransactionClient,
  ): Promise<InboundAssignee | null> {
    const roleCodes = this.assignableRoleCodes();
    if (roleCodes.length === 0) return null;

    const reps = await tx.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        roles: { some: { role: { code: { in: roleCodes } } } },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
      orderBy: { id: 'asc' },
    });
    if (reps.length === 0) return null;

    const state = await tx.inboundAssignmentState.upsert({
      where: { id: GLOBAL_STATE_ID },
      create: { id: GLOBAL_STATE_ID, cursor: 0 },
      update: {},
    });

    const idx = state.cursor % reps.length;
    const pick = reps[idx];

    await tx.inboundAssignmentState.update({
      where: { id: GLOBAL_STATE_ID },
      data: { cursor: state.cursor + 1 },
    });

    return {
      userId: pick.id,
      label: `${pick.firstName} ${pick.lastName} (${pick.email})`,
    };
  }
}
