'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { sendBulkNotification } from '@/actions/notifications';
import { Search, Send, Users, CheckCircle, Loader2, X } from 'lucide-react';

type Customer = {
  id: string;
  name: string;
  email: string | null;
  tags: string[] | null;
};

interface NotificationsClientProps {
  customers: Customer[];
}

export function NotificationsClient({ customers }: NotificationsClientProps) {
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [step, setStep] = useState<'compose' | 'confirm' | 'sending' | 'done'>('compose');
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Collect all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const c of customers) {
      if (Array.isArray(c.tags)) c.tags.forEach(t => tags.add(t));
    }
    return Array.from(tags).sort();
  }, [customers]);

  // Filter customers
  const filtered = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesTag =
        !tagFilter ||
        (Array.isArray(c.tags) && c.tags.includes(tagFilter));
      return matchesSearch && matchesTag;
    });
  }, [customers, search, tagFilter]);

  const withEmail = filtered.filter(c => c.email);

  const allSelected = withEmail.length > 0 && withEmail.every(c => selectedIds.has(c.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        withEmail.forEach(c => next.delete(c.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        withEmail.forEach(c => next.add(c.id));
        return next;
      });
    }
  };

  const toggleCustomer = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectByTag = (tag: string) => {
    const inTag = customers.filter(c => Array.isArray(c.tags) && c.tags.includes(tag) && c.email);
    setSelectedIds(prev => {
      const next = new Set(prev);
      inTag.forEach(c => next.add(c.id));
      return next;
    });
  };

  const selectedCount = selectedIds.size;
  const canSend = selectedCount > 0 && subject.trim() && body.trim();

  const handleSend = async () => {
    setStep('sending');
    setError(null);
    const res = await sendBulkNotification({
      customerIds: Array.from(selectedIds),
      subject,
      body,
    });
    if (res.success && 'sent' in res) {
      setResult({ sent: res.sent ?? 0, failed: res.failed ?? 0 });
      setStep('done');
    } else {
      setError(res.error ?? 'Failed to send');
      setStep('confirm');
    }
  };

  if (step === 'sending') {
    return (
      <Card>
        <CardContent className="py-16 text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
          <p className="font-medium">Sending notifications…</p>
        </CardContent>
      </Card>
    );
  }

  if (step === 'done' && result) {
    return (
      <Card>
        <CardContent className="py-16 text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <div>
            <h2 className="text-xl font-semibold">Notifications sent</h2>
            <p className="text-muted-foreground mt-1">
              {result.sent} sent successfully
              {result.failed > 0 && `, ${result.failed} failed`}.
            </p>
          </div>
          <Button
            onClick={() => {
              setStep('compose');
              setSelectedIds(new Set());
              setSubject('');
              setBody('');
              setResult(null);
            }}
            className="h-11"
          >
            Send another
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Recipients */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Select recipients
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Tag filters */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setTagFilter(null)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    !tagFilter
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input hover:bg-muted'
                  }`}
                >
                  All tags
                </button>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTagFilter(t => t === tag ? null : tag)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      tagFilter === tag
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-input hover:bg-muted'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {/* Quick select by tag */}
            {tagFilter && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => handleSelectByTag(tagFilter)}
              >
                Select all &ldquo;{tagFilter}&rdquo; customers
              </Button>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-9 h-9 text-sm"
                placeholder="Search customers…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch('')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Select all */}
            <div className="flex items-center gap-2 py-2 border-b">
              <Checkbox
                id="select-all"
                checked={allSelected}
                onCheckedChange={toggleAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Select all ({withEmail.length} with email)
              </label>
            </div>

            {/* Customer list */}
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {filtered.map(customer => (
                <label
                  key={customer.id}
                  className={`flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
                    !customer.email
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <Checkbox
                    checked={selectedIds.has(customer.id)}
                    onCheckedChange={() => customer.email && toggleCustomer(customer.id)}
                    disabled={!customer.email}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{customer.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {customer.email ?? 'No email'}
                    </p>
                  </div>
                  {Array.isArray(customer.tags) && customer.tags.length > 0 && (
                    <div className="flex gap-1 shrink-0">
                      {customer.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </label>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No customers found
                </p>
              )}
            </div>

            {selectedCount > 0 && (
              <p className="text-sm font-medium text-primary">
                {selectedCount} recipient{selectedCount !== 1 ? 's' : ''} selected
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: Compose */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compose message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                className="h-12"
                placeholder="e.g. Annual service reminder"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                rows={8}
                placeholder="Your message here…"
                value={body}
                onChange={e => setBody(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The customer&apos;s name and your company details will be added automatically.
              </p>
            </div>

            {/* Preview */}
            {body.trim() && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview</p>
                <p className="text-sm"><strong>Subject:</strong> {subject || '—'}</p>
                <p className="text-sm">Hi [Customer name],</p>
                {body.split('\n').map((line, i) => (
                  <p key={i} className="text-sm">{line || <br />}</p>
                ))}
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {step === 'confirm' ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Send to {selectedCount} customer{selectedCount !== 1 ? 's' : ''}?
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={() => setStep('compose')}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 h-12"
                    onClick={handleSend}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send to {selectedCount}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                className="w-full h-12"
                disabled={!canSend}
                onClick={() => setStep('confirm')}
              >
                <Send className="h-4 w-4 mr-2" />
                Send to {selectedCount || '…'} customer{selectedCount !== 1 ? 's' : ''}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
