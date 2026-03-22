-- Contract history fields for migrating existing businesses mid-cycle
ALTER TABLE "service_contracts" ADD COLUMN "contract_start_date" timestamp;
ALTER TABLE "service_contracts" ADD COLUMN "services_completed_in_cycle" integer NOT NULL DEFAULT 0;
ALTER TABLE "service_contracts" ADD COLUMN "cycle_invoice_status" text NOT NULL DEFAULT 'not_invoiced';
ALTER TABLE "service_contracts" ADD COLUMN "cycle_invoice_paid_date" timestamp;
