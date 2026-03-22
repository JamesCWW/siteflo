interface QuoteSentEmailProps {
  customerName: string;
  companyName: string;
  quoteRefNumber: string;
  totalFormatted: string;
  validUntil?: string;
  portalUrl: string;
  replyEmail: string;
  primaryColor?: string;
}

export function QuoteSentEmail({
  customerName,
  companyName,
  quoteRefNumber,
  totalFormatted,
  validUntil,
  portalUrl,
  replyEmail,
  primaryColor = '#18181b',
}: QuoteSentEmailProps) {
  return (
    <html>
      <body style={{ fontFamily: 'Arial, sans-serif', color: '#18181b', maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ borderBottom: `2px solid ${primaryColor}`, paddingBottom: 16, marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>{companyName}</h2>
        </div>

        <p style={{ fontSize: 16, fontWeight: 'bold', marginTop: 0 }}>
          Quote {quoteRefNumber}
        </p>

        <p>Hi {customerName},</p>

        <p>
          Please find your quote for <strong>{totalFormatted}</strong> attached.
          {validUntil && <> This quote is valid until <strong>{validUntil}</strong>.</>}
        </p>

        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <a
            href={portalUrl}
            style={{
              backgroundColor: primaryColor,
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: 6,
              textDecoration: 'none',
              fontWeight: 'bold',
              display: 'inline-block',
            }}
          >
            View &amp; approve quote
          </a>
        </div>

        <p>
          Questions? Reply to this email or contact us at{' '}
          <a href={`mailto:${replyEmail}`}>{replyEmail}</a>.
        </p>

        <p style={{ marginTop: 32, color: '#71717a', fontSize: 13 }}>
          Kind regards,
          <br />
          <strong>{companyName}</strong>
        </p>

        <div style={{ marginTop: 32, borderTop: '1px solid #e4e4e7', paddingTop: 16, fontSize: 11, color: '#a1a1aa' }}>
          This quote was sent by {companyName} via Siteflo.
        </div>
      </body>
    </html>
  );
}
