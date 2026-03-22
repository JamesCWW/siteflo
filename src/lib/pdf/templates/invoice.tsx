import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';

type Branding = {
  logoUrl?: string;
  primaryColor: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  bankName?: string;
  bankSortCode?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  vatNumber?: string;
};

type LineItem = {
  description: string;
  quantity: number;
  unitPricePence: number;
  totalPence: number;
};

type InvoicePDFProps = {
  branding: Branding;
  refNumber: string;
  status: string;
  customerName: string;
  customerAddress: string;
  lineItems: LineItem[];
  subtotalPence: number;
  vatPence: number;
  totalPence: number;
  dueDate: string;
  issuedDate: string;
};

function fmt(pence: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
}

export function InvoicePDF({
  branding,
  refNumber,
  customerName,
  customerAddress,
  lineItems,
  subtotalPence,
  vatPence,
  totalPence,
  dueDate,
  issuedDate,
}: InvoicePDFProps) {
  const primary = branding.primaryColor || '#18181b';

  const styles = StyleSheet.create({
    page: {
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: '#18181b',
      padding: 40,
      backgroundColor: '#ffffff',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 32,
      paddingBottom: 16,
      borderBottomWidth: 2,
      borderBottomColor: primary,
    },
    companyBlock: {
      flex: 1,
    },
    companyName: {
      fontSize: 16,
      fontFamily: 'Helvetica-Bold',
      color: primary,
      marginBottom: 4,
    },
    companyMeta: {
      fontSize: 8,
      color: '#71717a',
      lineHeight: 1.4,
    },
    invoiceLabel: {
      fontSize: 28,
      fontFamily: 'Helvetica-Bold',
      color: primary,
    },
    refText: {
      fontSize: 10,
      color: '#71717a',
      marginTop: 4,
    },
    addresses: {
      flexDirection: 'row',
      gap: 24,
      marginBottom: 24,
    },
    addressBlock: {
      flex: 1,
    },
    addressLabel: {
      fontSize: 8,
      color: '#71717a',
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    addressText: {
      fontSize: 10,
    },
    datesRow: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 24,
    },
    dateBlock: {
      backgroundColor: '#f4f4f5',
      padding: 10,
      borderRadius: 4,
      flex: 1,
    },
    dateLabel: {
      fontSize: 8,
      color: '#71717a',
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    dateValue: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: primary,
      color: '#ffffff',
      padding: '6 8',
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      borderRadius: 2,
    },
    tableRow: {
      flexDirection: 'row',
      padding: '6 8',
      borderBottomWidth: 0.5,
      borderBottomColor: '#e4e4e7',
    },
    colDesc: { flex: 3, fontSize: 9 },
    colQty: { width: 40, textAlign: 'right', fontSize: 9 },
    colUnit: { width: 70, textAlign: 'right', fontSize: 9 },
    colTotal: { width: 70, textAlign: 'right', fontSize: 9 },
    totalsBlock: {
      alignItems: 'flex-end',
      marginTop: 12,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 24,
      marginBottom: 4,
    },
    totalLabel: {
      fontSize: 9,
      color: '#71717a',
      width: 80,
      textAlign: 'right',
    },
    totalValue: {
      fontSize: 9,
      width: 70,
      textAlign: 'right',
    },
    grandTotalRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 24,
      marginTop: 6,
      paddingTop: 6,
      borderTopWidth: 1.5,
      borderTopColor: primary,
    },
    grandTotalLabel: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      width: 80,
      textAlign: 'right',
      color: primary,
    },
    grandTotalValue: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      width: 70,
      textAlign: 'right',
      color: primary,
    },
    bankBox: {
      marginTop: 24,
      backgroundColor: '#f4f4f5',
      padding: 12,
      borderRadius: 4,
      borderLeftWidth: 3,
      borderLeftColor: primary,
    },
    bankTitle: {
      fontSize: 9,
      fontFamily: 'Helvetica-Bold',
      marginBottom: 6,
      color: primary,
    },
    bankRow: {
      flexDirection: 'row',
      marginBottom: 2,
    },
    bankLabel: {
      fontSize: 8,
      color: '#71717a',
      width: 100,
    },
    bankValue: {
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
    },
    footer: {
      position: 'absolute',
      bottom: 30,
      left: 40,
      right: 40,
      borderTopWidth: 0.5,
      borderTopColor: '#e4e4e7',
      paddingTop: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    footerText: {
      fontSize: 8,
      color: '#a1a1aa',
    },
  });

  const hasBankDetails =
    branding.bankName || branding.bankAccountNumber || branding.bankSortCode;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.companyBlock}>
            {branding.logoUrl ? (
              <Image
                src={branding.logoUrl}
                style={{ width: 120, height: 40, objectFit: 'contain', marginBottom: 6 }}
              />
            ) : null}
            <Text style={styles.companyName}>{branding.companyName}</Text>
            <Text style={styles.companyMeta}>{branding.companyAddress}</Text>
            <Text style={styles.companyMeta}>{branding.companyPhone}</Text>
            <Text style={styles.companyMeta}>{branding.companyEmail}</Text>
            {branding.vatNumber ? (
              <Text style={styles.companyMeta}>VAT No: {branding.vatNumber}</Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.invoiceLabel}>INVOICE</Text>
            <Text style={styles.refText}>{refNumber}</Text>
          </View>
        </View>

        <View style={styles.addresses}>
          <View style={styles.addressBlock}>
            <Text style={styles.addressLabel}>Bill to</Text>
            <Text style={styles.addressText}>{customerName}</Text>
            <Text style={[styles.addressText, { color: '#71717a' }]}>{customerAddress}</Text>
          </View>
        </View>

        <View style={styles.datesRow}>
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>Issue date</Text>
            <Text style={styles.dateValue}>{issuedDate}</Text>
          </View>
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>Due date</Text>
            <Text style={styles.dateValue}>{dueDate}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Description</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colUnit}>Unit price</Text>
          <Text style={styles.colTotal}>Total</Text>
        </View>
        {lineItems.map((item, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.colDesc}>{item.description}</Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colUnit}>{fmt(item.unitPricePence)}</Text>
            <Text style={styles.colTotal}>{fmt(item.totalPence)}</Text>
          </View>
        ))}

        <View style={styles.totalsBlock}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{fmt(subtotalPence)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>VAT</Text>
            <Text style={styles.totalValue}>{fmt(vatPence)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total due</Text>
            <Text style={styles.grandTotalValue}>{fmt(totalPence)}</Text>
          </View>
        </View>

        {hasBankDetails ? (
          <View style={styles.bankBox}>
            <Text style={styles.bankTitle}>Payment details</Text>
            {branding.bankAccountName ? (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Account name</Text>
                <Text style={styles.bankValue}>{branding.bankAccountName}</Text>
              </View>
            ) : null}
            {branding.bankName ? (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Bank</Text>
                <Text style={styles.bankValue}>{branding.bankName}</Text>
              </View>
            ) : null}
            {branding.bankSortCode ? (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Sort code</Text>
                <Text style={styles.bankValue}>{branding.bankSortCode}</Text>
              </View>
            ) : null}
            {branding.bankAccountNumber ? (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Account number</Text>
                <Text style={styles.bankValue}>{branding.bankAccountNumber}</Text>
              </View>
            ) : null}
            <View style={[styles.bankRow, { marginTop: 6 }]}>
              <Text style={[styles.bankLabel, { color: '#18181b' }]}>Reference</Text>
              <Text style={styles.bankValue}>{refNumber}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{branding.companyName}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          } />
        </View>
      </Page>
    </Document>
  );
}
