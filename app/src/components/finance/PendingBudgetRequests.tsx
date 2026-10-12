'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { useLocaleSwitch } from '@/i18n/LocaleProvider';
import { Badge } from '@/components/ui/Badge';
import CollapsibleSection from './CollapsibleSection';
import { formatMoney, toNumber } from './money';

interface OpenRequest {
  id: string;
  amount: number;
  description: string;
  status: 'pending' | 'approved';
  projects: { id: string; name: string } | null;
}

/**
 * Read-only digest of budget requests that still need action across the workspace.
 * Approving, rejecting and paying stays on each project's budget card.
 */
export default function PendingBudgetRequests({ workspaceId, currency }: { workspaceId: string; currency: string }) {
  const t = useTranslations('pages.tools');
  const { locale } = useLocaleSwitch();
  const [requests, setRequests] = useState<OpenRequest[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from('project_budget_requests')
        .select('id, amount, description, status, is_paid, projects!inner(id, name, workspace_id)')
        .eq('projects.workspace_id', workspaceId)
        .or('status.eq.pending,and(status.eq.approved,is_paid.eq.false)')
        .order('created_at', { ascending: false })
        .limit(8);

      if (!cancelled && !error && data) setRequests(data as unknown as OpenRequest[]);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  if (requests.length === 0) return null;

  return (
    <CollapsibleSection
      title={t('finance.openRequests')}
      meta={t('finance.requestsCount', { count: requests.length })}
    >
      <ul className="divide-y divide-border">
        {requests.map((request) => (
          <li key={request.id}>
            <Link
              href={request.projects ? `/dashboard/projects/${request.projects.id}` : '/dashboard/projects'}
              className="flex min-h-14 items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-hover active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            >
              <span className="min-w-0">
                <span className="line-clamp-2 break-words text-sm font-medium text-text-primary">{request.description}</span>
                <span className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-text-secondary">
                  <span className="truncate">{request.projects?.name}</span>
                  <Badge size="sm" variant={request.status === 'pending' ? 'warning' : 'success'}>
                    {request.status === 'pending' ? t('finance.pending') : t('finance.approved')}
                  </Badge>
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-text-primary">
                {formatMoney(toNumber(request.amount), currency, locale)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </CollapsibleSection>
  );
}
