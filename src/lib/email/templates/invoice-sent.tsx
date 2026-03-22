interface InvoiceSentEmailProps {
  customerName: string;
  companyName: string;
  invoiceRefNumber: string;
  totalFormatted: string;
  dueDate: string;
  portalUrl: string;
  bankName?: string;
  bankSortCode?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  replyEmail: string;
  primaryColor?: string;
}

export function InvoiceSentEmail({
  customerName,
  companyName,
  invoiceRefNumber,
  totalFormatted,
  dueDate,
  portalUrl,
  bankName,
  bankSortCode,
  bankAccountNumber,
  bankAccountName,
  replyEmail,
  primaryColor = '#18181b',
}: InvoiceSentEmailProps) {
  const hasBankDetails = bankName || bankAccountNumber;

  return (
    <html>
      <body style={{ fontFamily: 'Arial, sans-serif', color: '#18181b', maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ borderBottom: `2px solid ${primaryColor}`, paddingBottom: 16, marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>{companyName}</h2>
        </div>

        <p style={{ fontSize: 16, fontWeight: 'bold', marginTop: 0 }}>
          Invoice {invoiceRefNumber}
        </p>

        <p>Hi {customerName},</p>

        <p>
          Please find your invoice for <strong>{totalFormatted}</strong> attached.
          Payment is due by <strong>{dueDate}</strong>.
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
            View invoice
          </a>
        </div>

        {hasBankDetails && (
          <div style={{ backgroundColor: '#f4f4f5', padding: 16, borderRadius: 8, borderLeft: `4px solid ${primaryColor}`, marginBottom: 16 }}>
            <p style={{ margin: '0 0 8px', fontWeight: 'bold', fontSize: 13 }}>Payment details</p>
            {bankAccountName && (
              <p style={{ margin: '2px 0', fontSize: 13 }}>
                <span style={{ color: '#71717a', width: 120, display: 'inline-block' }}>Account name</span>
                <strong>{bankAccountName}</strong>
              </p>
            )}
            {bankName && (
              <p style={{ margin: '2px 0', fontSize: 13 }}>
                <span style={{ color: '#71717a', width: 120, display: 'inline-block' }}>Bank</span>
                <strong>{bankName}</strong>
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
          Questions? Reply to this email or contact us at{' '}
          <a href={`mailto:${replyEmail}`}>{replyEmail}</a>.
        </p>

        <p style={{ marginTop: 32, color: '#71717a', fontSize: 13 }}>
          Kind regards,
          <br />
          <strong>{companyName}</strong>
        </p>

        <div style={{ marginTop: 32, borderTop: '1px solid #e4e4e7', paddingTop: 16, fontSize: 11, color: '#a1a1aa' }}>
          This invoice was sent by {companyName} via Siteflo.
        </div>
      </body>
    </html>
  );
}
