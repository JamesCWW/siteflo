-- Phase 5: Public booking page — no auth required to read tenant settings/slots

-- Allow public read of tenants by slug (for booking page)
CREATE POLICY "public_booking_tenant_read" ON tenants
  FOR SELECT
  USING (true);

-- Allow public read of jobs' scheduled times (for slot availability check)
-- We only expose the scheduled times, not full job data
-- This is handled by the server action which runs as service role

-- Automation rules and logs: tenant isolation (already covered by existing RLS pattern)
-- If automation tables don't have RLS yet:
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON automation_rules
  FOR ALL
  USING (
    tenant_id = (
      SELECT tenant_id FROM users
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "tenant_isolation" ON automation_logs
  FOR ALL
  USING (
    tenant_id = (
      SELECT tenant_id FROM users
      WHERE auth_id = auth.uid()
    )
  );
