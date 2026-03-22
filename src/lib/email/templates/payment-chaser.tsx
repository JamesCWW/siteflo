type Tone = 'friendly' | 'firm';

interface PaymentChaserEmailProps {
  customerName: string;
  companyName: string;
  invoiceRefNumber: string;
  totalFormatted: string;
  dueDate: string;
  daysOverdue: number;
  portalUrl: string;
  bankAccountName?: string;
  bankSortCode?: string;
  bankAccountNumber?: string;
  replyEmail: string;
  tone: Tone;
  primaryColor?: string;
}

export function PaymentChaserEmail({
  customerName,
  companyName,
  invoiceRefNumber,
  totalFormatted,
  dueDate,
  daysOverdue,
  portalUrl,
  bankAccountName,
  bankSortCode,
  bankAccountNumber,
  replyEmail,
  tone,
  primaryColor = '#18181b',
}: PaymentChaserEmailProps) {
  const isFriendly = tone === 'friendly';

  return (
    <html>
      <body style={{ fontFamily: 'Arial, sans-serif', color: '#18181b', maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ borderBottom: `2px solid ${primaryColor}`, paddingBottom: 16, marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>{companyName}</h2>
        </div>

        <p style={{ fontSize: 16, fontWeight: 'bold', marginTop: 0 }}>
          {isFriendly ? 'Payment reminder' : 'Overdue invoice — action required'}
        </p>

        <p>
          {isFriendly ? 'Hi' : 'Dear'} {customerName},
        </p>

        {isFriendly ? (
          <p>
            Just a quick reminder that invoice <strong>{invoiceRefNumber}</strong> for{' '}
            <strong>{totalFormatted}</strong> was due on <strong>{dueDate}</strong>. It&apos;s{' '}
            {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue — if you&apos;ve already
            sent payment, please ignore this email.
          </p>
        ) : (
          <p>
            Our records show that invoice <strong>{invoiceRefNumber}</strong> for{' '}
            <strong>{totalFormatted}</strong> (due <strong>{dueDate}</strong>) remains unpaid after{' '}
            <strong>{daysOverdue} days</strong>. Please arrange payment at your earliest opportunity.
          </p>
        )}

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
            View invoice
          </a>
        </div>

        {(bankAccountName || bankAccountNumber) && (
          <div style={{ backgroundColor: '#f4f4f5', padding: 16, borderRadius: 8, borderLeft: `4px solid ${primaryColor}`, marginBottom: 16 }}>
            <p style={{ margin: '0 0 8px', fontWeight: 'bold', fontSize: 13 }}>Bank transfer details</p>
            {bankAccountName && (
              <p style={{ margin: '2px 0', fontSize: 13 }}>
                <span style={{ color: '#71717a', width: 120, display: 'inline-block' }}>Account name</span>
                <strong>{bankAccountName}</strong>
              </p>
            )}
            {bankSortCode && (
              <p style={{ margin: '2px 0', fontSize: 13 }}>
                <span style={{ color: '#71717a', width: 120, display: 'inline-block' }}>Sort code</span>
                <strong>{bankSortCode}</strong>
              </p>
            )}
            {bankAccountNumber && (
              <p style={{ margin: '2px 0', fontSize: 13 }}>
                <span style={{ color: '#71717a', width: 120, display: 'inline-block' }}>Account number</span>
                <strong>{bankAccountNumber}</strong>
              </p>
            )}
            <p style={{ margin: '8px 0 0', fontSize: 13 }}>
              <span style={{ color: '#71717a', width: 120, display: 'inline-block' }}>Reference</span>
              <strong>{invoiceRefNumber}</strong>
            </p>
          </div>
        )}

        <p>
          {isFriendly
            ? `If you have any questions about this invoice, please get in touch at `
            : `If you believe this has been sent in error, please contact us at `}
          <a href={`mailto:${replyEmail}`}>{replyEmail}</a>.
        </p>

        <p style={{ marginTop: 32, color: '#71717a', fontSize: 13 }}>
          {isFriendly ? 'Thanks,' : 'Yours faithfully,'}
          <br />
          <strong>{companyName}</strong>
        </p>

        <div style={{ marginTop: 32, borderTop: '1px solid #e4e4e7', paddingTop: 16, fontSize: 11, color: '#a1a1aa' }}>
          This notice was sent by {companyName} via Siteflo.
        </div>
      </body>
    </html>
  );
}
