import { getAutomationRules, getAutomationLogs } from '@/actions/automation';
import { AutomationClient } from './automation-client';

export default async function AutomationPage() {
  const [rulesResult, logsResult] = await Promise.all([
    getAutomationRules(),
    getAutomationLogs(30),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Automation</h1>
        <p className="text-muted-foreground mt-1">
          Rules that run automatically to keep your business on track.
        </p>
      </div>
      <AutomationClient
        rules={rulesResult.data ?? []}
        logs={logsResult.data ?? []}
      />
    </div>
  );
}
