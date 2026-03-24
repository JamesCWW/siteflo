'use server';

import { db } from '@/db/client';
import { customers, tenants, notificationBatches, notificationLogs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/supabase/get-user';
import { sendEmail, buildFromAddress } from '@/lib/email/send';
import { revalidatePath } from 'next/cache';

export async function getCustomersForNotification() {
  try {
    const user = await getCurrentUser();
    const data = await db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        tags: customers.tags,
      })
      .from(customers)
      .where(eq(customers.tenantId, user.tenantId))
      .orderBy(customers.name);
    return { success: true, data };
  } catch (error) {
    console.error('getCustomersForNotification failed:', error);
    return { success: false, error: 'Failed to load customers', data: [] };
  }
}

export async function sendBulkNotification(input: {
  customerIds: string[];
  subject: string;
  body: string;
}) {
  try {
    const user = await getCurrentUser();

    if (!input.customerIds.length) {
      return { success: false, error: 'No recipients selected' };
    }
    if (!input.subject.trim()) return { success: false, error: 'Subject is required' };
    if (!input.body.trim()) return { success: false, error: 'Message body is required' };

    // Get tenant branding
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);

    const companyName = tenant?.branding?.companyName ?? 'Siteflo';
    const primaryColor = tenant?.branding?.primaryColor ?? '#18181b';
    const replyEmail = tenant?.branding?.companyEmail ?? '';
    const fromAddress = buildFromAddress(companyName);

    // Get selected customers with emails
    const selectedCustomers = await db
      .select({ id: customers.id, name: customers.name, email: customers.email })
      .from(customers)
      .where(eq(customers.tenantId, user.tenantId));

    const targets = selectedCustomers.filter(
      c => input.customerIds.includes(c.id) && c.email
    );

    if (!targets.length) {
      return { success: false, error: 'None of the selected customers have an email address' };
    }

    // Create batch record
    const [batch] = await db.insert(notificationBatches).values({
      tenantId: user.tenantId,
      subject: input.subject,
      body: input.body,
      recipientCount: targets.length,
      sentById: user.id,
    }).returning();

    // Send emails
    let sent = 0;
    let failed = 0;

    for (const customer of targets) {
      if (!customer.email) continue;

      const html = buildNotificationHtml({
        customerName: customer.name,
        companyName,
        subject: input.subject,
        body: input.body,
        replyEmail,
        primaryColor,
      });

      const result = await sendEmail({
        to: customer.email,
        subject: input.subject,
        from: fromAddress,
        replyTo: replyEmail || undefined,
        html,
      });

      await db.insert(notificationLogs).values({
        tenantId: user.tenantId,
        batchId: batch.id,
        customerId: customer.id,
        sentToEmail: customer.email,
        subject: input.subject,
        status: result.success ? 'sent' : 'failed',
        resendId: result.id ?? null,
        error: result.success ? null : (result.error ?? null),
      });

      if (result.success) sent++;
      else failed++;
    }

    revalidatePath('/notifications');
    return { success: true, sent, failed, batchId: batch.id };
  } catch (error) {
    console.error('sendBulkNotification failed:', error);
    return { success: false, error: 'Failed to send notifications' };
  }
}

function buildNotificationHtml(params: {
  customerName: string;
  companyName: string;
  subject: string;
  body: string;
  replyEmail: string;
  primaryColor: string;
}): string {
  const { customerName, companyName, body, replyEmail, primaryColor } = params;
  const lines = body.split('\n').map(l => `<p style="margin:0 0 12px">${escapeHtml(l)}</p>`).join('');

  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;color:#18181b;max-width:600px;margin:0 auto;padding:24px 16px">
  <div style="border-bottom:2px solid ${primaryColor};padding-bottom:16px;margin-bottom:24px">
    <h2 style="margin:0;font-size:22px">${escapeHtml(companyName)}</h2>
  </div>
  <p>Hi ${escapeHtml(customerName)},</p>
  ${lines}
  ${replyEmail ? `<p>If you have any questions, please contact us at <a href="mailto:${escapeHtml(replyEmail)}">${escapeHtml(replyEmail)}</a>.</p>` : ''}
  <p style="margin-top:32px;color:#71717a;font-size:13px">
    Kind regards,<br><strong>${escapeHtml(companyName)}</strong>
  </p>
  <div style="margin-top:32px;border-top:1px solid #e4e4e7;padding-top:16px;font-size:11px;color:#a1a1aa">
    This email was sent by ${escapeHtml(companyName)} via Siteflo.
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
