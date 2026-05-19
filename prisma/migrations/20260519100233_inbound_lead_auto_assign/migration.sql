-- AlterEnum
ALTER TYPE "CustomerHistoryType" ADD VALUE 'LEAD_AUTO_ASSIGNED';

-- CreateTable
CREATE TABLE "inbound_assignment_state" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "cursor" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inbound_assignment_state_pkey" PRIMARY KEY ("id")
);
