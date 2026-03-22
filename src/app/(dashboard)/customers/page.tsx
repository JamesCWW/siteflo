import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getCustomers } from '@/actions/customers';
import { Plus, User, Mail, Phone } from 'lucide-react';
import { CustomerSearch } from '@/components/customers/customer-search';

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { data: customerList } = await getCustomers(q);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {customerList.length} customer{customerList.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild className="h-12">
          <Link href="/customers/new">
            <Plus className="h-4 w-4 mr-2" />
            New customer
          </Link>
        </Button>
      </div>

      <CustomerSearch defaultValue={q} />

      {customerList.length === 0 ? (
        <div className="text-center py-16">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg">
            {q ? 'No customers found' : 'No customers yet'}
          </h3>
          <p className="text-muted-foreground text-sm mt-1 mb-6">
            {q
              ? `No customers match "${q}"`
              : 'Add your first customer to get started'}
          </p>
          {!q && (
            <Button asChild className="h-12">
              <Link href="/customers/new">
                <Plus className="h-4 w-4 mr-2" />
                Add customer
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {customerList.map((customer) => (
            <Link key={customer.id} href={`/customers/${customer.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{customer.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {customer.address.line1}, {customer.address.city}, {customer.address.postcode}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        {customer.email && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </span>
                        )}
                        {customer.phone && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 shrink-0">
                      {Array.isArray(customer.tags) && customer.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
