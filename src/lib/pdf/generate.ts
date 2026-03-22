import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { createElement, type ReactElement } from 'react';
import { ServiceReportPDF } from './templates/service-report';
import { InvoicePDF } from './templates/invoice';
import { createClient } from '@/lib/supabase/server';

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

type FieldDefinition = {
  id: string;
  label: string;
  type: string;
  unit?: string;
  sortOrder: number;
};

type LineItem = {
  description: string;
  quantity: number;
  unitPricePence: number;
  totalPence: number;
};

export async function generateServiceReportPDF(params: {
  tenantId: string;
  jobId: string;
  branding: Branding;
  reportTitle: string;
  refNumber: string;
  customerName: string;
  siteAddress: string;
  scheduledDate?: string;
  completedDate?: string;
  fieldSchema: FieldDefinition[];
  fieldValues: Record<string, unknown>;
  footerText?: string;
  showSignature?: boolean;
}): Promise<{ success: true; pdfUrl: string } | { success: false; error: string }> {
  try {
    const element = createElement(ServiceReportPDF, {
      branding: params.branding,
      reportTitle: params.reportTitle,
      refNumber: params.refNumber,
      customerName: params.customerName,
      siteAddress: params.siteAddress,
      scheduledDate: params.scheduledDate,
      completedDate: params.completedDate,
      fieldSchema: params.fieldSchema,
      fieldValues: params.fieldValues,
      footerText: params.footerText,
      showSignature: params.showSignature,
    });

    const buffer = await renderToBuffer(element as ReactElement<DocumentProps>);
    const storagePath = `${params.tenantId}/jobs/${params.jobId}/report.pdf`;

    const supabase = await createClient();
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('PDF upload error:', uploadError);
      return { success: false, error: 'Failed to upload PDF' };
    }

    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(storagePath);

    return { success: true, pdfUrl: urlData.publicUrl };
  } catch (error) {
    console.error('generateServiceReportPDF failed:', error);
    return { success: false, error: 'Failed to generate PDF' };
  }
}

export async function generateInvoicePDF(params: {
  tenantId: string;
  invoiceId: string;
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
}): Promise<{ success: true; pdfUrl: string } | { success: false; error: string }> {
  try {
    const element = createElement(InvoicePDF, {
      branding: params.branding,
      refNumber: params.refNumber,
      status: params.status,
      customerName: params.customerName,
      customerAddress: params.customerAddress,
      lineItems: params.lineItems,
      subtotalPence: params.subtotalPence,
      vatPence: params.vatPence,
      totalPence: params.totalPence,
      dueDate: params.dueDate,
      issuedDate: params.issuedDate,
    });

    const buffer = await renderToBuffer(element as ReactElement<DocumentProps>);
    const storagePath = `${params.tenantId}/invoices/${params.invoiceId}/invoice.pdf`;

    const supabase = await createClient();
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Invoice PDF upload error:', uploadError);
      return { success: false, error: 'Failed to upload invoice PDF' };
    }

    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(storagePath);

    return { success: true, pdfUrl: urlData.publicUrl };
  } catch (error) {
    console.error('generateInvoicePDF failed:', error);
    return { success: false, error: 'Failed to generate invoice PDF' };
  }
}
