import { notFound } from 'next/navigation';
import { getCustomer } from '@/actions/customers';
import { getTemplatesForSelect } from '@/actions/contracts';
import { ContractForm } from '@/components/contracts/contract-form';

export default async function NewContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [customerResult, templatesResult] = await Promise.all([
    getCustomer(id),
    getTemplatesForSelect(),
  ]);

  if (!customerResult.success || !customerResult.data) notFound();

  const customer = customerResult.data;
  const templates = templatesResult.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add service contract</h1>
        <p className="text-muted-foreground text-sm mt-1">
          For {customer.name}
        </p>
      </div>
      <ContractForm
        customerId={id}
        customerName={customer.name}
        templates={templates}
      />
    </div>
  );
}
