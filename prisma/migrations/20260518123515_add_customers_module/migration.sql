-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CustomerHistoryType" AS ENUM ('PROFILE_CREATED', 'WEB_INQUIRY', 'LEAD_SUBMITTED', 'PROFILE_UPDATED', 'CONTACT_UPDATED', 'COMPANY_UPDATED', 'NOTE_ADDED', 'MANUAL');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "customer_id" TEXT;

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "display_name" TEXT,
    "primary_email" TEXT NOT NULL,
    "phone" TEXT,
    "secondary_email" TEXT,
    "address_line" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postal_code" TEXT,
    "country" TEXT,
    "company_name" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "company_size" TEXT,
    "job_title" TEXT,
    "profile_notes" TEXT,
    "linked_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_history" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "type" "CustomerHistoryType" NOT NULL,
    "summary" VARCHAR(512) NOT NULL,
    "detail" TEXT,
    "lead_id" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_primary_email_key" ON "customers"("primary_email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_linked_user_id_key" ON "customers"("linked_user_id");

-- CreateIndex
CREATE INDEX "customers_company_name_idx" ON "customers"("company_name");

-- CreateIndex
CREATE INDEX "customers_last_name_first_name_idx" ON "customers"("last_name", "first_name");

-- CreateIndex
CREATE INDEX "customer_history_customer_id_idx" ON "customer_history"("customer_id");

-- CreateIndex
CREATE INDEX "customer_history_created_at_idx" ON "customer_history"("created_at");

-- CreateIndex
CREATE INDEX "leads_customer_id_idx" ON "leads"("customer_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_linked_user_id_fkey" FOREIGN KEY ("linked_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_history" ADD CONSTRAINT "customer_history_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_history" ADD CONSTRAINT "customer_history_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_history" ADD CONSTRAINT "customer_history_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
