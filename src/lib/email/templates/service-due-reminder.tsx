interface ServiceDueReminderEmailProps {
  customerName: string;
  companyName: string;
  serviceTitle: string;
  nextDueDate: string;
  bookingUrl: string;
  replyEmail: string;
  companyPhone: string;
  isFollowUp?: boolean;
  primaryColor?: string;
}

export function ServiceDueReminderEmail({
  customerName,
  companyName,
  serviceTitle,
  nextDueDate,
  bookingUrl,
  replyEmail,
  companyPhone,
  isFollowUp = false,
  primaryColor = '#18181b',
}: ServiceDueReminderEmailProps) {
  return (
    <html>
      <body style={{ fontFamily: 'Arial, sans-serif', color: '#18181b', maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ borderBottom: `2px solid ${primaryColor}`, paddingBottom: 16, marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>{companyName}</h2>
        </div>

        <p style={{ fontSize: 16, fontWeight: 'bold', marginTop: 0 }}>
          {isFollowUp ? 'Just a quick follow-up' : 'Your service is due soon'}
        </p>

        <p>Hi {customerName},</p>

        {isFollowUp ? (
          <p>
            We wanted to follow up on our recent reminder — your <strong>{serviceTitle}</strong>{' '}
            is due on <strong>{nextDueDate}</strong>. There&apos;s still time to book your appointment.
          </p>
        ) : (
          <p>
            Your <strong>{serviceTitle}</strong> is coming up. We have you scheduled for{' '}
            <strong>{nextDueDate}</strong> — please book your appointment at your earliest convenience.
          </p>
        )}

        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <a
            href={bookingUrl}
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
            Book your appointment
          </a>
        </div>

        <p>
          Prefer to call us? We&apos;re on{' '}
          <a href={`tel:${companyPhone}`}>{companyPhone}</a> or{' '}
          <a href={`mailto:${replyEmail}`}>{replyEmail}</a>.
        </p>

        <p style={{ marginTop: 32, color: '#71717a', fontSize: 13 }}>
          Kind regards,
          <br />
          <strong>{companyName}</strong>
        </p>

        <div style={{ marginTop: 32, borderTop: '1px solid #e4e4e7', paddingTop: 16, fontSize: 11, color: '#a1a1aa' }}>
          This reminder was sent by {companyName} via Siteflo. To unsubscribe, please contact {replyEmail}.
        </div>
      </body>
    </html>
  );
}
