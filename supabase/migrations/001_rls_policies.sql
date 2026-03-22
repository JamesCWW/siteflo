-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT tenant_id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- Tenant isolation policy template (apply to each table)
CREATE POLICY "tenant_isolation" ON users
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_isolation" ON customers
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_isolation" ON service_contracts
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_isolation" ON jobs
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_isolation" ON job_photos
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_isolation" ON service_templates
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_isolation" ON parts_library
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_isolation" ON automation_rules
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_isolation" ON automation_logs
  FOR ALL USING (tenant_id = get_tenant_id());

-- Quote/Invoice line items use parent table's RLS
CREATE POLICY "tenant_isolation" ON quotes
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_isolation" ON invoices
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "quote_line_items_access" ON quote_line_items
  FOR ALL USING (
    quote_id IN (SELECT id FROM quotes WHERE tenant_id = get_tenant_id())
  );

CREATE POLICY "invoice_line_items_access" ON invoice_line_items
  FOR ALL USING (
    invoice_id IN (SELECT id FROM invoices WHERE tenant_id = get_tenant_id())
  );

-- Public portal access
CREATE POLICY "public_portal_access" ON quotes
  FOR SELECT
  USING (access_token = current_setting('app.access_token', true));

CREATE POLICY "public_portal_access" ON invoices
  FOR SELECT
  USING (access_token = current_setting('app.access_token', true));
