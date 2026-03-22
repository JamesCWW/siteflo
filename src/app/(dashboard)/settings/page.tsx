import { getTenantSettings } from '@/actions/settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BusinessInfoForm } from '@/components/settings/business-info-form';
import { BrandingForm } from '@/components/settings/branding-form';
import { BankDetailsForm } from '@/components/settings/bank-details-form';
import { WorkingHoursForm } from '@/components/settings/working-hours-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Users, Wand2 } from 'lucide-react';

export default async function SettingsPage() {
  const result = await getTenantSettings();
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Failed to load settings');
  }

  const tenant = result.data;

  // Normalize JSONB fields — existing tenant rows may have null or partial
  // objects if they were created before the schema added these fields.
  const branding = {
    primaryColor: '#0ea5e9',
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    ...(tenant.branding && typeof tenant.branding === 'object' ? tenant.branding : {}),
  };

  const settings = {
    defaultCurrency: 'GBP',
    defaultVatRate: 20,
    quoteExpiryDays: 30,
    invoicePaymentTermsDays: 14,
    workingHoursStart: '08:00',
    workingHoursEnd: '17:00',
    workingDays: [1, 2, 3, 4, 5],
    bookingSlotMinutes: 60,
    ...(tenant.settings && typeof tenant.settings === 'object' ? tenant.settings : {}),
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your business details, branding, and preferences.</p>
      </div>

      {/* Setup wizard shortcut */}
      <Link href="/onboarding">
        <Card className="hover:shadow-sm transition-shadow cursor-pointer">
          <CardContent className="py-4 flex items-center gap-3">
            <Wand2 className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">Re-run setup wizard</p>
              <p className="text-xs text-muted-foreground">Change your trade, re-seed templates, or update business details</p>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Team management shortcut */}
      <Link href="/settings/team">
        <Card className="hover:shadow-sm transition-shadow cursor-pointer">
          <CardContent className="py-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">Team management</p>
              <p className="text-xs text-muted-foreground">Invite and manage team members</p>
            </div>
          </CardContent>
        </Card>
      </Link>

      <Tabs defaultValue="business">
        <TabsList
          className="w-full rounded-lg bg-muted p-1"
          style={{ display: 'flex', flexDirection: 'row', height: 48 }}
        >
          <TabsTrigger value="business" style={{ flex: 1 }}>Business</TabsTrigger>
          <TabsTrigger value="branding" style={{ flex: 1 }}>Branding</TabsTrigger>
          <TabsTrigger value="bank" style={{ flex: 1 }}>Bank</TabsTrigger>
          <TabsTrigger value="hours" style={{ flex: 1 }}>Hours</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business information</CardTitle>
            </CardHeader>
            <CardContent>
              <BusinessInfoForm branding={branding} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Branding</CardTitle>
            </CardHeader>
            <CardContent>
              <BrandingForm branding={branding} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bank details</CardTitle>
            </CardHeader>
            <CardContent>
              <BankDetailsForm branding={branding} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Working hours &amp; booking</CardTitle>
            </CardHeader>
            <CardContent>
              <WorkingHoursForm settings={settings} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
