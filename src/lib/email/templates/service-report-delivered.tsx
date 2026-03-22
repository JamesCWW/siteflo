interface ServiceReportDeliveredProps {
  customerName: string;
  companyName: string;
  jobRefNumber: string;
  serviceTitle: string;
  completedDate: string;
  siteAddress: string;
  pdfUrl?: string;
  replyEmail: string;
  primaryColor?: string;
}

export function ServiceReportDeliveredEmail({
  customerName,
  companyName,
  jobRefNumber,
  serviceTitle,
  completedDate,
  siteAddress,
  pdfUrl,
  replyEmail,
  primaryColor = '#18181b',
}: ServiceReportDeliveredProps) {
  return (
    <html>
      <body style={{ fontFamily: 'Arial, sans-serif', color: '#18181b', maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ borderBottom: `2px solid ${primaryColor}`, paddingBottom: 16, marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>{companyName}</h2>
        </div>

        <p style={{ fontSize: 16, fontWeight: 'bold', marginTop: 0 }}>
          Your service report is ready
        </p>

        <p>Hi {customerName},</p>

        <p>
          Thank you for having us. We&apos;ve completed your <strong>{serviceTitle}</strong> at{' '}
          {siteAddress} on <strong>{completedDate}</strong>.
        </p>

        <p>Your service report (ref: <strong>{jobRefNumber}</strong>) is attached to this email.</p>

        {pdfUrl && (
          <div style={{ textAlign: 'center', margin: '24px 0' }}>
            <a
              href={pdfUrl}
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
              Download report
            </a>
          </div>
        )}

        <p>
          If you have any questions, please reply to this email or contact us at{' '}
          <a href={`mailto:${replyEmail}`}>{replyEmail}</a>.
        </p>

        <p style={{ marginTop: 32, color: '#71717a', fontSize: 13 }}>
          Kind regards,
          <br />
          <strong>{companyName}</strong>
        </p>

        <div style={{ marginTop: 32, borderTop: '1px solid #e4e4e7', paddingTop: 16, fontSize: 11, color: '#a1a1aa' }}>
          This email was sent by {companyName} via Siteflo.
        </div>
      </body>
    </html>
  );
}
