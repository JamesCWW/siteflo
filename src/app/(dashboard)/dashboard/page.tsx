import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getInvoices } from '@/actions/invoices';
import { getJobs } from '@/actions/jobs';
import { db } from '@/db/client';
import { serviceContracts, customers, automationLogs, automationRules } from '@/db/schema';
import { eq, and, lte, asc, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/supabase/get-user';
import { formatPence } from '@/lib/utils/money';
import { format, addDays, formatDistanceToNow, differenceInCalendarDays } from 'date-fns';
import {
  FileText, Briefcase, Receipt, AlertTriangle,
  CheckCircle2, XCircle, MinusCircle, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // Parallel data fetching — allSettled so one failure doesn't blank the page
  const results = await Promise.allSettled([
    db
      .select({ contract: serviceContracts, customer: { id: customers.id, name: customers.name } })
      .from(serviceContracts)
      .innerJoin(customers, eq(serviceContracts.customerId, customers.id))
      .where(and(
        eq(serviceContracts.tenantId, user.tenantId),
        eq(serviceContracts.status, 'active'),
        lte(serviceContracts.nextDueDate, addDays(new Date(), 30)),
      ))
      .orderBy(asc(serviceContracts.nextDueDate))
      .limit(5),

    getJobs({ status: 'scheduled' }),

    getInvoices({ status: 'draft' }),
    getInvoices({ status: 'overdue' }),
    getInvoices({ status: 'sent' }),

    db
      .select({ log: automationLogs, rule: { name: automationRules.name, trigger: automationRules.trigger } })
      .from(automationLogs)
      .innerJoin(automationRules, eq(automationLogs.ruleId, automationRules.id))
      .where(eq(automationLogs.tenantId, user.tenantId))
      .orderBy(desc(automationLogs.executedAt))
      .limit(10),
  ]);

  const contractsDueSoon = results[0].status === 'fulfilled' ? results[0].value : [];
  const upcomingJobsResult = results[1].status === 'fulfilled' ? results[1].value : { data: [] };
  const draftInvoicesResult = results[2].status === 'fulfilled' ? results[2].value : { data: [] };
  const overdueInvoicesResult = results[3].status === 'fulfilled' ? results[3].value : { data: [] };
  const sentInvoicesResult = results[4].status === 'fulfilled' ? results[4].value : { data: [] };
  const recentLogs = results[5].status === 'fulfilled' ? results[5].value : [];

  const upcomingJobs = (upcomingJobsResult.data ?? []).slice(0, 5);
  const draftInvoices = draftInvoicesResult.data ?? [];

  const overdueInvoices = [
    ...(overdueInvoicesResult.data ?? []),
    ...(sentInvoicesResult.data ?? []).filter(
      ({ invoice }) => new Date(invoice.dueDate) < new Date()
    ),
  ];
  const overdueTotal = overdueInvoices.reduce((sum, { invoice }) => sum + invoice.totalPence, 0);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/contracts?filter=due-soon">
          <Card className="hover:shadow-sm transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-amber-500" />
                <p className="text-sm text-muted-foreground">Contracts due soon</p>
              </div>
              <p className="text-3xl font-bold mt-2">{contractsDueSoon.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Next 30 days</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/jobs?status=scheduled">
          <Card className="hover:shadow-sm transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Briefcase className="h-5 w-5 text-blue-500" />
                <p className="text-sm text-muted-foreground">Upcoming jobs</p>
              </div>
              <p className="text-3xl font-bold mt-2">{upcomingJobs.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Scheduled</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/invoices?status=draft">
          <Card className="hover:shadow-sm transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Receipt className="h-5 w-5 text-purple-500" />
                <p className="text-sm text-muted-foreground">Draft invoices</p>
              </div>
              <p className="text-3xl font-bold mt-2">{draftInvoices.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/invoices?status=overdue">
          <Card className={cn(
            'hover:shadow-sm transition-shadow cursor-pointer',
            overdueInvoices.length > 0 && 'border-red-200'
          )}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className={cn('h-5 w-5', overdueInvoices.length > 0 ? 'text-red-500' : 'text-muted-foreground')} />
                <p className="text-sm text-muted-foreground">Overdue invoices</p>
              </div>
              <p className={cn('text-3xl font-bold mt-2', overdueInvoices.length > 0 && 'text-red-600')}>
                {overdueInvoices.length}
              </p>
              {overdueTotal > 0 && (
                <p className="text-xs text-red-500 font-medium mt-1">{formatPence(overdueTotal)} outstanding</p>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Draft invoices list */}
        {draftInvoices.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Draft invoices
                <Link href="/invoices?status=draft" className="text-xs font-normal text-muted-foreground hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-0">
              {draftInvoices.slice(0, 4).map(({ invoice, customer, job }) => (
                <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                  <div className="flex items-center justify-between py-3 px-6 hover:bg-muted/50 transition-colors min-h-[52px]">
                    <div>
                      <p className="text-sm font-medium">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{invoice.refNumber} · Job {job.refNumber}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm font-bold">{formatPence(invoice.totalPence)}</p>
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs mt-1">
                        <span>Review & send</span>
                      </Button>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No draft invoices</p>
              <p className="text-xs mt-1">Invoices auto-draft when a booking is confirmed.</p>
            </CardContent>
          </Card>
        )}

        {/* Overdue invoices */}
        {overdueInvoices.length > 0 && (
          <Card className="border-red-100">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between text-red-700">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Overdue invoices
                </span>
                <Link href="/invoices?status=overdue" className="text-xs font-normal text-muted-foreground hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-0">
              {overdueInvoices.slice(0, 4).map(({ invoice, customer }) => {
                const daysOverdue = differenceInCalendarDays(new Date(), new Date(invoice.dueDate));
                return (
                  <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                    <div className="flex items-center justify-between py-3 px-6 hover:bg-red-50/50 transition-colors min-h-[52px]">
                      <div>
                        <p className="text-sm font-medium">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{invoice.refNumber}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-sm font-bold">{formatPence(invoice.totalPence)}</p>
                        <p className="text-xs text-red-500">{daysOverdue}d overdue</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Contracts due soon */}
        {contractsDueSoon.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Contracts due soon
                <Link href="/contracts" className="text-xs font-normal text-muted-foreground hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-0">
              {contractsDueSoon.map(({ contract, customer }) => {
                const daysLeft = differenceInCalendarDays(new Date(contract.nextDueDate), new Date());
                return (
                  <Link key={contract.id} href={`/contracts/${contract.id}`}>
                    <div className="flex items-center justify-between py-3 px-6 hover:bg-muted/50 transition-colors min-h-[52px]">
                      <div>
                        <p className="text-sm font-medium">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{contract.title}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-sm font-medium text-amber-600">
                          {format(new Date(contract.nextDueDate), 'dd MMM')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {daysLeft <= 0 ? 'Today' : `in ${daysLeft}d`}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No contracts due soon</p>
              <p className="text-xs mt-1">Great work — nothing due in the next 30 days.</p>
            </CardContent>
          </Card>
        )}

        {/* Upcoming jobs */}
        {upcomingJobs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Upcoming jobs
                <Link href="/jobs" className="text-xs font-normal text-muted-foreground hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-0">
              {upcomingJobs.map(({ job, customer }) => (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <div className="flex items-center justify-between py-3 px-6 hover:bg-muted/50 transition-colors min-h-[52px]">
                    <div>
                      <p className="text-sm font-medium">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{job.refNumber}</p>
                    </div>
                    {job.scheduledStart && (
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-sm font-medium">
                          {format(new Date(job.scheduledStart), 'dd MMM')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(job.scheduledStart), 'HH:mm')}
                        </p>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recent activity */}
        {recentLogs.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Recent automation activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentLogs.map(({ log, rule }) => (
                  <div key={log.id} className="flex items-start gap-3 px-6 py-3 min-h-[52px]">
                    <div className="mt-0.5 shrink-0">
                      {log.status === 'sent' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      {log.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                      {log.status === 'skipped' && <MinusCircle className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{rule.name}</span>
                        <Badge
                          variant={log.status === 'sent' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {log.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(log.executedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {draftInvoices.length === 0 && contractsDueSoon.length === 0 && upcomingJobs.length === 0 && overdueInvoices.length === 0 && recentLogs.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-medium">All clear!</p>
          <p className="text-sm mt-1">No draft invoices, upcoming jobs, or contracts due soon.</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline">
              <Link href="/customers/new">Add your first customer</Link>
            </Button>
            <Button asChild>
              <Link href="/contracts">View all contracts</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
