-- Phase 4: Portal public access for invoices and quotes
-- These policies allow unauthenticated portal views via access_token

-- invoices: allow public SELECT by access token (for customer portal)
CREATE POLICY "portal_invoice_access" ON invoices
  FOR SELECT
  USING (
    access_token = current_setting('request.headers', true)::jsonb->>'x-portal-token'
    OR tenant_id = (
      SELECT tenant_id FROM users WHERE auth_id = auth.uid()
    )
  );

-- If the above causes issues, a simpler approach is to bypass RLS in the server action
-- (using service role key). The getInvoiceByToken action runs without auth context.

-- quotes: allow public SELECT by access token
CREATE POLICY "portal_quote_access" ON quotes
  FOR SELECT
  USING (
    access_token = current_setting('request.headers', true)::jsonb->>'x-portal-token'
    OR tenant_id = (
      SELECT tenant_id FROM users WHERE auth_id = auth.uid()
    )
  );

-- parts_library: tenant isolation (same as other tables)
ALTER TABLE parts_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON parts_library
  FOR ALL
  USING (
    tenant_id = (
      SELECT tenant_id FROM users WHERE auth_id = auth.uid()
    )
  );

-- invoice_line_items: tenant isolation via parent invoice
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_via_invoice" ON invoice_line_items
  FOR ALL
  USING (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE tenant_id = (
        SELECT tenant_id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- quote_line_items: tenant isolation via parent quote
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_via_quote" ON quote_line_items
  FOR ALL
  USING (
    quote_id IN (
      SELECT id FROM quotes
      WHERE tenant_id = (
        SELECT tenant_id FROM users WHERE auth_id = auth.uid()
      )
    )
  );
