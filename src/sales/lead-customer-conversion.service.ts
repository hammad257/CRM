import { Injectable } from '@nestjs/common';
import {
  CustomerHistoryType,
  DealStatus,
  LeadStatus,
  Prisma,
} from '@prisma/client';

/**
 * PDF workflow: lead becomes a customer after a successful (WON) deal.
 */
@Injectable()
export class LeadCustomerConversionService {
  /**
   * When a deal is marked WON: ensure a customer profile exists, link lead & deal,
   * set lead status to CONVERTED, and append customer history.
   */
  async finalizeWonDeal(
    tx: Prisma.TransactionClient,
    dealId: string,
    actorId?: string,
  ): Promise<void> {
    const deal = await tx.deal.findUnique({
      where: { id: dealId },
      select: {
        id: true,
        title: true,
        customerId: true,
        leadId: true,
        lead: {
          select: {
            id: true,
            title: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            jobTitle: true,
            companyName: true,
            customerId: true,
            status: true,
          },
        },
      },
    });
    if (!deal) return;

    let customerId = deal.customerId ?? deal.lead?.customerId ?? null;

    if (!customerId && deal.lead) {
      customerId = await this.createOrLinkCustomerFromLead(
        tx,
        deal.lead,
        deal.title,
        actorId,
      );
    }

    if (customerId) {
      await tx.deal.update({
        where: { id: dealId },
        data: { customerId },
      });
    }

    if (deal.leadId) {
      await tx.lead.update({
        where: { id: deal.leadId },
        data: {
          status: LeadStatus.CONVERTED,
          ...(customerId ? { customerId } : {}),
        },
      });
    }

    if (customerId) {
      await tx.customerHistory.create({
        data: {
          customerId,
          type: CustomerHistoryType.DEAL_WON,
          summary: `Deal won: ${deal.title}`,
          leadId: deal.leadId,
          createdById: actorId ?? null,
        },
      });
    }
  }

  private async createOrLinkCustomerFromLead(
    tx: Prisma.TransactionClient,
    lead: {
      id: string;
      title: string | null;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
      jobTitle: string | null;
      companyName: string | null;
      customerId: string | null;
    },
    dealTitle: string,
    actorId?: string,
  ): Promise<string> {
    if (lead.customerId) return lead.customerId;

    const normalizedEmail = lead.email?.trim().toLowerCase();
    if (normalizedEmail) {
      const existing = await tx.customer.findUnique({
        where: { primaryEmail: normalizedEmail },
        select: { id: true },
      });
      if (existing) {
        await tx.lead.update({
          where: { id: lead.id },
          data: { customerId: existing.id },
        });
        return existing.id;
      }
    }

    const primaryEmail =
      normalizedEmail ?? `lead+${lead.id}@inbound.crm`;

    const customer = await tx.customer.create({
      data: {
        firstName: lead.firstName,
        lastName: lead.lastName,
        primaryEmail,
        phone: lead.phone,
        jobTitle: lead.jobTitle,
        companyName: lead.companyName,
      },
    });

    await tx.customerHistory.create({
      data: {
        customerId: customer.id,
        type: CustomerHistoryType.LEAD_CONVERTED_TO_CUSTOMER,
        summary: `Lead converted to customer after won deal: ${dealTitle}`,
        detail: lead.title ?? undefined,
        leadId: lead.id,
        createdById: actorId ?? null,
      },
    });

    await tx.lead.update({
      where: { id: lead.id },
      data: { customerId: customer.id },
    });

    return customer.id;
  }

  /** True when update should run won-deal customer finalization. */
  shouldFinalizeWon(
    previousStatus: DealStatus,
    nextStatus: DealStatus | undefined,
  ): boolean {
    return (
      nextStatus === DealStatus.WON && previousStatus !== DealStatus.WON
    );
  }
}
