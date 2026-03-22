import { CustomerForm } from '@/components/customers/customer-form';

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New customer</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Add a customer to start tracking their service contracts
        </p>
      </div>
      <CustomerForm />
    </div>
  );
}
