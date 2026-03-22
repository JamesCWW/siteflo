-- Rename interval_months → service_interval_months
ALTER TABLE "service_contracts" RENAME COLUMN "interval_months" TO "service_interval_months";

-- Rename next_due_date → next_service_date
ALTER TABLE "service_contracts" RENAME COLUMN "next_due_date" TO "next_service_date";

-- Add billing_interval_months, back-fill from service_interval_months, then constrain
ALTER TABLE "service_contracts" ADD COLUMN "billing_interval_months" integer;
UPDATE "service_contracts" SET "billing_interval_months" = "service_interval_months";
ALTER TABLE "service_contracts" ALTER COLUMN "billing_interval_months" SET NOT NULL;
ALTER TABLE "service_contracts" ALTER COLUMN "billing_interval_months" SET DEFAULT 12;

-- Add invoice_timing with default 'upfront' for all existing rows
ALTER TABLE "service_contracts" ADD COLUMN "invoice_timing" text NOT NULL DEFAULT 'upfront';

-- Add billing cycle tracking columns (nullable — populated at first invoice event)
ALTER TABLE "service_contracts" ADD COLUMN "billing_cycle_start" timestamp;
ALTER TABLE "service_contracts" ADD COLUMN "next_invoice_date" timestamp;
