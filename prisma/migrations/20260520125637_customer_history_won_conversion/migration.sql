-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CustomerHistoryType" ADD VALUE 'LEAD_CONVERTED_TO_CUSTOMER';
ALTER TYPE "CustomerHistoryType" ADD VALUE 'DEAL_WON';
