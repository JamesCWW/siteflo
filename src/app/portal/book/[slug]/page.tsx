import { getTenantBySlug, getContractForBooking } from '@/actions/booking';
import { BookingForm } from './booking-form';
import { notFound } from 'next/navigation';

interface BookingPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ contractId?: string }>;
}

export default async function BookingPage({ params, searchParams }: BookingPageProps) {
  const { slug } = await params;
  const { contractId } = await searchParams;

  const tenantResult = await getTenantBySlug(slug);
  if (!tenantResult.success || !tenantResult.data) {
    notFound();
  }

  const tenant = tenantResult.data!;
  const primaryColor = tenant.branding.primaryColor || '#2563eb';

  let prefillName: string | undefined;
  let prefillEmail: string | undefined;
  let prefillPhone: string | undefined;
  let prefillAddressLine1: string | undefined;
  let prefillAddressCity: string | undefined;
  let prefillAddressPostcode: string | undefined;
  let serviceTitle: string | undefined;

  if (contractId) {
    const result = await getContractForBooking(contractId, tenant.id);
    if (result.success && result.data) {
      const { contract, customer } = result.data;
      prefillName = customer.name;
      prefillEmail = customer.email ?? undefined;
      prefillPhone = customer.phone ?? undefined;
      prefillAddressLine1 = customer.address.line1;
      prefillAddressCity = customer.address.city;
      prefillAddressPostcode = customer.address.postcode;
      serviceTitle = contract.title;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Branded header bar */}
      <div className="h-1.5 w-full" style={{ backgroundColor: primaryColor }} />

      <div className="max-w-lg mx-auto px-4 py-8 sm:py-12">
        {/* Company name + service */}
        <div className="mb-8 text-center">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3 text-white font-bold text-lg"
            style={{ backgroundColor: primaryColor }}
          >
            {tenant.branding.companyName.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-xl font-bold text-gray-900">{tenant.branding.companyName}</h1>
          {serviceTitle ? (
            <p className="text-sm text-gray-500 mt-1">Booking: <span className="font-medium text-gray-700">{serviceTitle}</span></p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">Book an appointment</p>
          )}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <BookingForm
            tenantSlug={slug}
            tenantId={tenant.id}
            contractId={contractId}
            prefillName={prefillName}
            prefillEmail={prefillEmail}
            prefillPhone={prefillPhone}
            prefillAddressLine1={prefillAddressLine1}
            prefillAddressCity={prefillAddressCity}
            prefillAddressPostcode={prefillAddressPostcode}
            serviceTitle={serviceTitle}
            workingDays={tenant.settings.workingDays}
            workingHoursStart={tenant.settings.workingHoursStart}
            workingHoursEnd={tenant.settings.workingHoursEnd}
            bookingSlotMinutes={tenant.settings.bookingSlotMinutes}
            primaryColor={primaryColor}
          />
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by Siteflo
        </p>
      </div>
    </div>
  );
}
