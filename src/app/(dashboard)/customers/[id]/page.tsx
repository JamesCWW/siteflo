import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCustomer } from '@/actions/customers';
import { getContractsForCustomer } from '@/actions/contracts';
import { ContractStatusBadge } from '@/components/contracts/contract-status-badge';
import { formatPence } from '@/lib/utils/money';
import { format, formatDistanceToNow } from 'date-fns';
import { Mail, Phone, MapPin, Pencil, Plus, FileText, Calendar } from 'lucide-react';
import { DeleteCustomerButton } from './delete-customer-button';

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [customerResult, contractsResult] = await Promise.all([
    getCustomer(id),
    getContractsForCustomer(id),
  ]);

  if (!customerResult.success || !customerResult.data) notFound();

  const customer = customerResult.data;
  const contracts = contractsResult.data;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Customer since {format(new Date(customer.createdAt), 'MMM yyyy')}
          </p>
        </div>
        <Button asChild variant="outline" className="h-12 shrink-0">
          <Link href={`/customers/${id}/edit`}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>

      {/* Contact info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-sm">
              <p>{customer.address.line1}</p>
              {customer.address.line2 && <p>{customer.address.line2}</p>}
              <p>{customer.address.city}, {customer.address.postcode}</p>
              <p className="text-muted-foreground">{customer.address.country}</p>
            </div>
          </div>
          {customer.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`mailto:${customer.email}`} className="text-sm hover:underline">
                {customer.email}
              </a>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`tel:${customer.phone}`} className="text-sm hover:underline">
                {customer.phone}
              </a>
            </div>
          )}
          {Array.isArray(customer.tags) && customer.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {customer.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}
          {customer.notes && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{customer.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service contracts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Service contracts</h2>
          <Button asChild className="h-12">
            <Link href={`/customers/${id}/contracts/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Add contract
            </Link>
          </Button>
        </div>

        {contracts.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No service contracts yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Add a service contract to start tracking recurring maintenance
              </p>
              <Button asChild className="h-12">
                <Link href={`/customers/${id}/contracts/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add contract
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {contracts.map((contract) => (
              <Link key={contract.id} href={`/contracts/${contract.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{contract.title}</p>
                          <ContractStatusBadge status={contract.status} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {contract.refNumber} · Every {contract.serviceIntervalMonths} month{contract.serviceIntervalMonths !== 1 ? 's' : ''}
                          {contract.standardPricePence != null && ` · ${formatPence(contract.standardPricePence)}`}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 text-sm">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Due {format(new Date(contract.nextServiceDate), 'dd MMM yyyy')}
                          </span>
                          <span className="text-muted-foreground">
                            ({formatDistanceToNow(new Date(contract.nextServiceDate), { addSuffix: true })})
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground shrink-0">
                        {contract.totalServicesCompleted} service{contract.totalServicesCompleted !== 1 ? 's' : ''} completed
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
      {/* Danger zone */}
      <div className="border border-destructive/30 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-destructive">Danger zone</h3>
        <p className="text-xs text-muted-foreground">
          Permanently delete this customer, all their service contracts, jobs, invoices, and service records.
        </p>
        <DeleteCustomerButton customerId={id} />
      </div>
    </div>
  );
}
