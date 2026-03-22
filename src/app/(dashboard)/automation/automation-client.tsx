'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toggleAutomationRule, seedDefaultAutomationRules } from '@/actions/automation';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, MinusCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';

const TRIGGER_LABELS: Record<string, string> = {
  contract_service_due: 'Service due reminder',
  contract_booking_confirmed: 'Booking confirmed',
  contract_service_completed: 'Service completed',
  job_scheduled: 'Job scheduled',
  job_completed: 'Job completed',
  appointment_reminder: 'Appointment reminder',
  invoice_sent: 'Invoice sent',
  invoice_overdue: 'Invoice overdue',
  quote_sent: 'Quote sent',
  quote_no_response: 'Quote no response',
};

const TRIGGER_DESCRIPTIONS: Record<string, string> = {
  contract_service_due: 'Sends reminder emails to customers when their service is approaching the due date (30, 14, and 7 days before).',
  contract_booking_confirmed: 'Auto-creates a draft invoice and notifies you when a customer books via the portal.',
  contract_service_completed: 'Sends the service report PDF to the customer after a contract service is completed.',
  job_scheduled: 'Sends a confirmation email when a job is scheduled.',
  job_completed: 'Sends the service report PDF when a job is marked as complete.',
  appointment_reminder: 'Sends customers a reminder email 24 hours before their scheduled appointment.',
  invoice_sent: 'Sends an email to the customer when an invoice is issued.',
  invoice_overdue: 'Sends payment chase emails at 7 and 14 days overdue; notifies you at 21 days.',
  quote_sent: 'Sends an email with the quote link when a quote is sent to a customer.',
  quote_no_response: 'Follows up with a customer if they haven\'t responded to a quote after several days.',
};

const ACTION_LABELS: Record<string, string> = {
  send_email: 'Send email',
  send_sms: 'Send SMS',
  notify_owner: 'Notify owner',
  update_status: 'Update status',
  create_draft_invoice: 'Create draft invoice',
};

type Rule = {
  id: string;
  name: string;
  isActive: boolean;
  trigger: string;
  action: string;
  conditions: Record<string, unknown>;
  actionConfig: Record<string, unknown>;
};

type Log = {
  log: {
    id: string;
    action: string;
    status: 'sent' | 'failed' | 'skipped';
    executedAt: Date;
    details: unknown;
    contractId: string | null;
    jobId: string | null;
    invoiceId: string | null;
  };
  rule: {
    id: string;
    name: string;
    trigger: string;
  };
};

interface AutomationClientProps {
  rules: Rule[];
  logs: Log[];
}

export function AutomationClient({ rules, logs }: AutomationClientProps) {
  const router = useRouter();
  const [ruleStates, setRuleStates] = useState<Record<string, boolean>>(
    Object.fromEntries(rules.map((r) => [r.id, r.isActive]))
  );
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [seeding, setSeeding] = useState(false);

  async function handleSeed() {
    setSeeding(true);
    const result = await seedDefaultAutomationRules();
    setSeeding(false);
    if (result.success) {
      toast.success(`Created ${result.count} automation rules`);
      router.refresh();
    } else {
      toast.error(result.error ?? 'Failed to create rules');
    }
  }

  async function handleToggle(id: string, value: boolean) {
    // Optimistic update
    setRuleStates((prev) => ({ ...prev, [id]: value }));
    setPendingIds((prev) => new Set(prev).add(id));

    const result = await toggleAutomationRule(id, value);

    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    if (result.success) {
      toast.success(value ? 'Rule enabled' : 'Rule disabled');
    } else {
      // Revert
      setRuleStates((prev) => ({ ...prev, [id]: !value }));
      toast.error('Failed to update rule');
    }
  }

  return (
    <div className="space-y-8">
      {/* Rules */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Automation rules</h2>
        {rules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="font-medium text-foreground">No automation rules found</p>
              <p className="text-sm mt-1 max-w-sm mx-auto">
                Rules are normally created at registration. Use the button below to set them up now.
              </p>
              <Button
                onClick={handleSeed}
                disabled={seeding}
                className="mt-4"
                size="sm"
              >
                {seeding ? 'Setting up…' : 'Set up default automation rules'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <Switch
                      checked={ruleStates[rule.id] ?? rule.isActive}
                      onCheckedChange={(v) => handleToggle(rule.id, v)}
                      disabled={pendingIds.has(rule.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{rule.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {TRIGGER_LABELS[rule.trigger] ?? rule.trigger}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {ACTION_LABELS[rule.action] ?? rule.action}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {TRIGGER_DESCRIPTIONS[rule.trigger] ?? ''}
                      </p>
                    </div>
                    <Badge
                      variant={ruleStates[rule.id] ? 'default' : 'secondary'}
                      className="shrink-0"
                    >
                      {ruleStates[rule.id] ? 'On' : 'Off'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Recent logs */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Recent activity</h2>
        {logs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>No automation activity yet.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {logs.map(({ log, rule }) => (
                  <div key={log.id} className="flex items-start gap-3 p-4">
                    <div className="mt-0.5 shrink-0">
                      {log.status === 'sent' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      {log.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                      {log.status === 'skipped' && <MinusCircle className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{rule.name}</span>
                        <Badge variant="outline" className="text-xs">{log.action}</Badge>
                        <Badge
                          variant={
                            log.status === 'sent' ? 'default'
                            : log.status === 'failed' ? 'destructive'
                            : 'secondary'
                          }
                          className="text-xs"
                        >
                          {log.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(log.executedAt), 'dd MMM yyyy HH:mm')}
                        {log.contractId && ` · Contract`}
                        {log.jobId && ` · Job`}
                        {log.invoiceId && ` · Invoice`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
