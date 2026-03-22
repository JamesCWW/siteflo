import { notFound } from 'next/navigation';
import { getContract, getTemplatesForSelect } from '@/actions/contracts';
import { getCustomers } from '@/actions/customers';
import { getTechnicians } from '@/actions/jobs';
import { JobForm } from '@/components/jobs/job-form';

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ contractId?: string }>;
}) {
  const params = await searchParams;
  const contractId = params.contractId;

  const [techResult, templateResult] = await Promise.all([
    getTechnicians(),
    getTemplatesForSelect(),
  ]);

  const technicians = techResult.data ?? [];
  const templates = templateResult.data ?? [];

  // Contract-linked path
  if (contractId) {
    const contractResult = await getContract(contractId);
    if (!contractResult.success || !contractResult.data) notFound();

    const { contract, customer } = contractResult.data;

    // Get template name if linked
    let templateName: string | undefined;
    if (contract.templateId) {
      const t = templates.find((t) => t.id === contract.templateId);
      templateName = t?.name;
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Schedule service</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Book a visit for {contract.title}
          </p>
        </div>
        <JobForm
          contractId={contractId}
          contractTitle={contract.title}
          prefilledCustomerId={customer.id}
          prefilledCustomerName={customer.name}
          prefilledTemplateId={contract.templateId ?? undefined}
          prefilledTemplateName={templateName}
          technicians={technicians}
        />
      </div>
    );
  }

  // Standalone job path
  const customersResult = await getCustomers();
  const customerList = (customersResult.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New job</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create a standalone job or callout
        </p>
      </div>
      <JobForm
        customers={customerList}
        templates={templates}
        technicians={technicians}
      />
    </div>
  );
}
