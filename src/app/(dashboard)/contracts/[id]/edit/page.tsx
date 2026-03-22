import { notFound } from 'next/navigation';
import { getContract, getTemplatesForSelect } from '@/actions/contracts';
import { ContractForm } from '@/components/contracts/contract-form';
import { format } from 'date-fns';

export default async function EditContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, templatesResult] = await Promise.all([
    getContract(id),
    getTemplatesForSelect(),
  ]);

  if (!result.success || !result.data) notFound();

  const { contract, customer } = result.data;
  const templates = templatesResult.data ?? [];

  const installDetails = contract.installationDetails as {
    make?: string;
    model?: string;
    serialNumber?: string;
    location?: string;
    warrantyExpiry?: string;
  } | null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit service contract</h1>
        <p className="text-muted-foreground text-sm mt-1">For {customer.name}</p>
      </div>
      <ContractForm
        mode="edit"
        contractId={id}
        customerId={contract.customerId}
        customerName={customer.name}
        templates={templates}
        initialValues={{
          title: contract.title,
          serviceIntervalMonths: contract.serviceIntervalMonths,
          billingIntervalMonths: contract.billingIntervalMonths,
          invoiceTiming: contract.invoiceTiming,
          nextServiceDate: format(new Date(contract.nextServiceDate), 'yyyy-MM-dd'),
          reminderLeadDays: contract.reminderLeadDays,
          templateId: contract.templateId ?? undefined,
          standardPriceGbp: contract.standardPricePence != null
            ? contract.standardPricePence / 100
            : undefined,
          description: contract.description ?? undefined,
          installationDate: contract.installationDate
            ? format(new Date(contract.installationDate), 'yyyy-MM-dd')
            : undefined,
          installationDetails: installDetails ?? undefined,
          // Import / mid-cycle fields
          contractStartDate: contract.contractStartDate
            ? format(new Date(contract.contractStartDate), 'yyyy-MM-dd')
            : undefined,
          lastServiceDate: contract.lastServiceDate
            ? format(new Date(contract.lastServiceDate), 'yyyy-MM-dd')
            : undefined,
          servicesCompletedInCycle: contract.servicesCompletedInCycle,
          totalServicesCompleted: contract.totalServicesCompleted,
          billingCycleStart: contract.billingCycleStart
            ? format(new Date(contract.billingCycleStart), 'yyyy-MM-dd')
            : undefined,
          cycleInvoiceStatus: contract.cycleInvoiceStatus,
          cycleInvoicePaidDate: contract.cycleInvoicePaidDate
            ? format(new Date(contract.cycleInvoicePaidDate), 'yyyy-MM-dd')
            : undefined,
          nextInvoiceDate: contract.nextInvoiceDate
            ? format(new Date(contract.nextInvoiceDate), 'yyyy-MM-dd')
            : undefined,
        }}
      />
    </div>
  );
}
