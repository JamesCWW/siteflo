import { notFound } from 'next/navigation';
import { CustomerForm } from '@/components/customers/customer-form';
import { getCustomer } from '@/actions/customers';

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getCustomer(id);

  if (!result.success || !result.data) notFound();

  const customer = result.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit customer</h1>
        <p className="text-muted-foreground text-sm mt-1">{customer.name}</p>
      </div>
      <CustomerForm
        customerId={id}
        defaultValues={{
          name: customer.name,
          address: customer.address,
          email: customer.email ?? '',
          phone: customer.phone ?? '',
          notes: customer.notes ?? '',
          tags: Array.isArray(customer.tags) ? customer.tags : [],
        }}
      />
    </div>
  );
}
