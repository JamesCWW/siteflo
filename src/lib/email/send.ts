import { Resend } from 'resend';
import { type ReactElement } from 'react';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  return new Resend(key);
}

export type EmailPayload = {
  to: string;
  subject: string;
  from?: string;
  replyTo?: string;
} & ({ react: ReactElement; html?: never } | { html: string; react?: never });

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const fromAddress = payload.from ?? process.env.EMAIL_FROM ?? 'noreply@siteflo.io';

    const base = {
      from: fromAddress,
      to: payload.to,
      subject: payload.subject,
      ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
    };

    const resend = getResend();
    const { data, error } = await (payload.react
      ? resend.emails.send({ ...base, react: payload.react })
      : resend.emails.send({ ...base, html: payload.html ?? '' }));

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error('sendEmail failed:', err);
    return { success: false, error: 'Failed to send email' };
  }
}

// Convenience builder that stamps the from address with the company name
export function buildFromAddress(companyName: string): string {
  const domain = process.env.EMAIL_DOMAIN ?? 'siteflo.io';
  const safe = companyName.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  return `${safe} via Siteflo <notifications@${domain}>`;
}
