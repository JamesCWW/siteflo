import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { format, parseISO, isValid } from 'date-fns';

type Branding = {
  logoUrl?: string;
  primaryColor: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  vatNumber?: string;
};

type FieldDefinition = {
  id: string;
  label: string;
  type: string;
  unit?: string;
  sortOrder: number;
};

type ServiceReportPDFProps = {
  branding: Branding;
  reportTitle: string;
  refNumber: string;
  customerName: string;
  siteAddress: string;
  nextServiceDate?: string;
  completedDate?: string;
  fieldSchema: FieldDefinition[];
  fieldValues: Record<string, unknown>;
  footerText?: string;
  showSignature?: boolean;
};

// Returns null for checkbox-group — those get their own JSX branch.
function formatFieldValue(value: unknown, type: string, unit?: string): string | null {
  if (type === 'checkbox-group') return null;
  if (value === null || value === undefined || value === '') return '\u2014';
  if (type === 'boolean') return value ? 'Yes' : 'No';
  if (type === 'photo' || type === 'signature') return '[See attached]';
  if (type === 'date') {
    const str = String(value);
    if (!str) return '\u2014';
    // HTML date inputs store YYYY-MM-DD; may also arrive as a full ISO string
    try {
      const parsed = parseISO(str);
      if (isValid(parsed)) return format(parsed, 'dd MMM yyyy');
    } catch {
      // fall through to raw string
    }
    return str;
  }
  const str = String(value);
  return unit ? `${str} ${unit}` : str;
}

// Parses a checkbox-group value that may be a string[] or a JSON-encoded string.
function parseCheckboxGroup(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // fall through
    }
  }
  return [];
}

export function ServiceReportPDF({
  branding,
  reportTitle,
  refNumber,
  customerName,
  siteAddress,
  nextServiceDate,
  completedDate,
  fieldSchema,
  fieldValues,
  footerText,
  showSignature = true,
}: ServiceReportPDFProps) {
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
      marginBottom: 24,
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
    reportTitleBlock: {
      alignItems: 'flex-end',
    },
    reportTitle: {
      fontSize: 18,
      fontFamily: 'Helvetica-Bold',
      color: primary,
    },
    refNumber: {
      fontSize: 9,
      color: '#71717a',
      marginTop: 2,
    },
    metaRow: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 20,
    },
    metaBlock: {
      flex: 1,
      backgroundColor: '#f4f4f5',
      padding: 10,
      borderRadius: 4,
    },
    metaLabel: {
      fontSize: 8,
      color: '#71717a',
      marginBottom: 2,
      textTransform: 'uppercase',
    },
    metaValue: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
    },
    sectionHeader: {
      backgroundColor: primary,
      color: '#ffffff',
      padding: '6 10',
      fontSize: 9,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
      marginTop: 12,
      borderRadius: 2,
    },
    fieldRow: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomColor: '#e4e4e7',
      paddingVertical: 5,
    },
    fieldLabel: {
      width: '45%',
      fontSize: 9,
      color: '#52525b',
    },
    fieldValue: {
      flex: 1,
      fontSize: 9,
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

  const dataFields = fieldSchema.filter(f =>
    f.type !== 'section-header' &&
    f.type !== 'photo' &&
    f.type !== 'signature' &&
    f.id !== 'service_date' &&
    f.id !== 'next_service_due'
  );
  const photoFields = fieldSchema.filter(f => f.type === 'photo');
  const signatureField = showSignature ? fieldSchema.find(f => f.type === 'signature') : undefined;
  const sigUrl = signatureField ? fieldValues[signatureField.id] : undefined;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.companyBlock}>
            {branding.logoUrl && (
              <Image
                src={branding.logoUrl}
                style={{ width: 120, height: 40, objectFit: 'contain', marginBottom: 6 }}
              />
            )}
            <Text style={styles.companyName}>{branding.companyName}</Text>
            <Text style={styles.companyMeta}>{branding.companyAddress}</Text>
            <Text style={styles.companyMeta}>{branding.companyPhone}</Text>
            <Text style={styles.companyMeta}>{branding.companyEmail}</Text>
            {branding.vatNumber ? (
              <Text style={styles.companyMeta}>VAT: {branding.vatNumber}</Text>
            ) : null}
          </View>
          <View style={styles.reportTitleBlock}>
            <Text style={styles.reportTitle}>{reportTitle}</Text>
            <Text style={styles.refNumber}>{refNumber}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Customer</Text>
            <Text style={styles.metaValue}>{customerName}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Site address</Text>
            <Text style={styles.metaValue}>{siteAddress}</Text>
          </View>
          {completedDate ? (
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Completed</Text>
              <Text style={styles.metaValue}>{completedDate}</Text>
            </View>
          ) : null}
          {nextServiceDate ? (
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Next service</Text>
              <Text style={styles.metaValue}>{nextServiceDate}</Text>
            </View>
          ) : null}
        </View>

        {dataFields.length > 0 ? (
          <View>
            <Text style={styles.sectionHeader}>Service Record</Text>
            {dataFields.map(field => (
              field.type === 'checkbox-group' ? (
                <View key={field.id} style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <View style={{ flex: 1 }}>
                    {parseCheckboxGroup(fieldValues[field.id]).length > 0 ? (
                      parseCheckboxGroup(fieldValues[field.id]).map((item, i) => (
                        <Text key={i} style={styles.fieldValue}>{'\u2713'} {item}</Text>
                      ))
                    ) : (
                      <Text style={styles.fieldValue}>{'\u2014'}</Text>
                    )}
                  </View>
                </View>
              ) : (
                <View key={field.id} style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <Text style={styles.fieldValue}>
                    {formatFieldValue(fieldValues[field.id], field.type, field.unit) ?? '\u2014'}
                  </Text>
                </View>
              )
            ))}
          </View>
        ) : null}

        {photoFields.length > 0 ? (
          <View>
            <Text style={styles.sectionHeader}>Photos</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {photoFields.map(field => {
                const url = fieldValues[field.id];
                if (typeof url !== 'string' || !url) return null;
                return (
                  <Image
                    key={field.id}
                    src={url}
                    style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 2 }}
                  />
                );
              })}
            </View>
          </View>
        ) : null}

        {sigUrl && typeof sigUrl === 'string' ? (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.sectionHeader}>Signature</Text>
            <Image
              src={sigUrl}
              style={{ width: 200, height: 60, objectFit: 'contain', marginTop: 4 }}
            />
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {footerText ?? `Generated by ${branding.companyName}`}
          </Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          } />
        </View>
      </Page>
    </Document>
  );
}
