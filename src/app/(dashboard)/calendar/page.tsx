import { db } from '@/db/client';
import { jobs, customers, serviceContracts, users } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/supabase/get-user';
import { addMonths, subMonths } from 'date-fns';
import { CalendarView } from '@/components/calendar/calendar-view';

export default async function CalendarPage() {
  const user = await getCurrentUser();

  const now = new Date();
  const rangeStart = subMonths(now, 1);
  const rangeEnd = addMonths(now, 3);

  // Fetch jobs with customer names within a generous range
  const jobRows = await db
    .select({
      job: jobs,
      customer: {
        id: customers.id,
        name: customers.name,
      },
    })
    .from(jobs)
    .innerJoin(customers, eq(jobs.customerId, customers.id))
    .where(
      and(
        eq(jobs.tenantId, user.tenantId),
        gte(jobs.scheduledStart, rangeStart),
        lte(jobs.scheduledStart, rangeEnd),
      )
    );

  // Fetch upcoming contract due dates
  const contractRows = await db
    .select({
      contract: serviceContracts,
      customer: {
        name: customers.name,
      },
    })
    .from(serviceContracts)
    .innerJoin(customers, eq(serviceContracts.customerId, customers.id))
    .where(
      and(
        eq(serviceContracts.tenantId, user.tenantId),
        eq(serviceContracts.status, 'active'),
        gte(serviceContracts.nextServiceDate, rangeStart),
        lte(serviceContracts.nextServiceDate, rangeEnd),
      )
    );

  // Fetch technicians for filter
  const techRows = await db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(and(eq(users.tenantId, user.tenantId), eq(users.isActive, true)));

  const calendarJobs = jobRows.map(({ job, customer }) => ({
    id: job.id,
    refNumber: job.refNumber,
    description: job.description,
    status: job.status,
    scheduledStart: job.scheduledStart?.toISOString() ?? null,
    scheduledEnd: job.scheduledEnd?.toISOString() ?? null,
    customerName: customer.name,
  }));

  const contractsDue = contractRows.map(({ contract, customer }) => ({
    id: contract.id,
    title: contract.title,
    nextServiceDate: contract.nextServiceDate.toISOString(),
    customerName: customer.name,
  }));

  return (
    <div className="flex flex-col gap-4 -mx-4 md:-mx-6 lg:-mx-8 -mt-6">
      <div className="px-4 md:px-6 lg:px-8 pt-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-muted-foreground mt-1">Your schedule and upcoming contract due dates.</p>
      </div>
      <div className="px-4 md:px-6 lg:px-8 pb-4">
        <CalendarView
          jobs={calendarJobs}
          contractsDue={contractsDue}
          technicians={techRows}
        />
      </div>
    </div>
  );
}
