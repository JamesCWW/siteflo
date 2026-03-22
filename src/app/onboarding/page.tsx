import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { getOnboardingData } from '@/actions/onboarding';
import { getTemplatesForSelect } from '@/actions/contracts';

export default async function OnboardingPage() {
  const [data, templatesResult] = await Promise.all([
    getOnboardingData(),
    getTemplatesForSelect(),
  ]);

  return (
    <OnboardingWizard
      companyName={data.companyName}
      tenantId={data.tenantId}
      templates={templatesResult.data ?? []}
    />
  );
}
