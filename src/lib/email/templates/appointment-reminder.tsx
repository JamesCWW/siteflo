interface AppointmentReminderEmailProps {
  customerName: string;
  companyName: string;
  serviceTitle: string;
  scheduledDate: string;
  scheduledTime: string;
  siteAddress: string;
  jobRefNumber: string;
  replyEmail: string;
  companyPhone: string;
  primaryColor?: string;
}

export function AppointmentReminderEmail({
  customerName,
  companyName,
  serviceTitle,
  scheduledDate,
  scheduledTime,
  siteAddress,
  jobRefNumber,
  replyEmail,
  companyPhone,
  primaryColor = '#18181b',
}: AppointmentReminderEmailProps) {
  return (
    <html>
      <body style={{ fontFamily: 'Arial, sans-serif', color: '#18181b', maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ borderBottom: `2px solid ${primaryColor}`, paddingBottom: 16, marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>{companyName}</h2>
        </div>

        <p style={{ fontSize: 16, fontWeight: 'bold', marginTop: 0 }}>
          Appointment reminder
        </p>

        <p>Hi {customerName},</p>

        <p>
          This is a friendly reminder that your <strong>{serviceTitle}</strong> is scheduled for
          tomorrow.
        </p>

        <div style={{ backgroundColor: '#f4f4f5', padding: 16, borderRadius: 8, borderLeft: `4px solid ${primaryColor}`, margin: '16px 0' }}>
          <p style={{ margin: '0 0 6px', fontSize: 13 }}>
            <span style={{ color: '#71717a', width: 80, display: 'inline-block' }}>Date</span>
            <strong>{scheduledDate}</strong>
          </p>
          <p style={{ margin: '0 0 6px', fontSize: 13 }}>
            <span style={{ color: '#71717a', width: 80, display: 'inline-block' }}>Time</span>
            <strong>{scheduledTime}</strong>
          </p>
          <p style={{ margin: '0 0 6px', fontSize: 13 }}>
            <span style={{ color: '#71717a', width: 80, display: 'inline-block' }}>Address</span>
            <strong>{siteAddress}</strong>
          </p>
          <p style={{ margin: 0, fontSize: 13 }}>
            <span style={{ color: '#71717a', width: 80, display: 'inline-block' }}>Ref</span>
            <strong>{jobRefNumber}</strong>
          </p>
        </div>

        <p>
          If you need to reschedule or have any questions, please contact us at{' '}
          <a href={`mailto:${replyEmail}`}>{replyEmail}</a> or call{' '}
          <a href={`tel:${companyPhone}`}>{companyPhone}</a>.
        </p>

        <p style={{ marginTop: 32, color: '#71717a', fontSize: 13 }}>
          See you tomorrow,
          <br />
          <strong>{companyName}</strong>
        </p>

        <div style={{ marginTop: 32, borderTop: '1px solid #e4e4e7', paddingTop: 16, fontSize: 11, color: '#a1a1aa' }}>
          This reminder was sent by {companyName} via Siteflo.
        </div>
      </body>
    </html>
  );
}
