'use client';

import { useEffect, useState, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getSessionUser } from '@/lib/auth-client'
import { format } from 'date-fns';
import { enUS, mk } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import { useLocaleSwitch } from '@/i18n/LocaleProvider';
import { Segmented } from '@/components/tools/Segmented';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Input';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatMoney } from './money';

const BUDGET_CATEGORY_KEYS: Record<string, string> = {
  'Software Subscription': 'finance.budgetCatSoftware',
  Hardware: 'finance.budgetCatHardware',
  Services: 'finance.budgetCatServices',
  Marketing: 'finance.budgetCatMarketing',
  Infrastructure: 'finance.budgetCatInfrastructure',
  'Office Supplies': 'finance.budgetCatOffice',
  Travel: 'finance.budgetCatTravel',
  Training: 'finance.budgetCatTraining',
  Consulting: 'finance.budgetCatConsulting',
  Other: 'finance.budgetCatOther',
};

interface BudgetRequest {
  id: string;
  amount: number;
  description: string;
  category: string | null;
  justification: string | null;
  status: 'pending' | 'approved' | 'rejected';
  is_paid: boolean;
  rejection_reason: string | null;
  created_at: string;
  approved_at: string | null;
  paid_at: string | null;
  requester: {
    username: string;
  } | null;
  approver: {
    username: string;
  } | null;
}

interface BudgetRequestsListProps {
  projectId: string;
  isOwner: boolean;
  onUpdate: () => void;
}

export default function BudgetRequestsList({ projectId, isOwner, onUpdate }: BudgetRequestsListProps) {
  const t = useTranslations('pages.tools');
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const { locale } = useLocaleSwitch();
  const dateLocale = locale === 'mk' ? mk : enUS;
  const money = (value: number) => formatMoney(value, 'USD', locale);
  const [requests, setRequests] = useState<BudgetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('project_budget_requests')
      .select(`
        *,
        requester:profiles!requester_id(username),
        approver:profiles!approved_by(username)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (data) setRequests(data);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadRequests();
  }, [projectId, loadRequests]);

  const handleApprove = async (requestId: string) => {
    try {
      const user = await getSessionUser();
      if (!user) return;

      const { error } = await supabase
        .from('project_budget_requests')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      await loadRequests();
      onUpdate();
    } catch (error) {
      console.error('Failed to approve request:', error);
      toast.error(t('finance.approveFailed'));
    }
  };

  const handleReject = (requestId: string) => {
    setRejectReason('');
    setRejectTarget(requestId);
  };

  const submitReject = async () => {
    const requestId = rejectTarget;
    if (!requestId) return;
    const reason = rejectReason.trim();
    setRejecting(true);

    try {
      const user = await getSessionUser();
      if (!user) return;

      const { error } = await supabase
        .from('project_budget_requests')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason || null,
        })
        .eq('id', requestId);

      if (error) throw error;

      await loadRequests();
      onUpdate();
      setRejectTarget(null);
    } catch (error) {
      console.error('Failed to reject request:', error);
      toast.error(t('finance.rejectFailed'));
    } finally {
      setRejecting(false);
    }
  };

  const handleMarkPaid = async (requestId: string) => {
    if (!(await confirm({ title: t('finance.markPaidConfirm'), confirmLabel: t('finance.markAsPaid'), tone: 'primary' }))) return;

    try {
      const { error } = await supabase
        .from('project_budget_requests')
        .update({
          is_paid: true,
          paid_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      await loadRequests();
      onUpdate();
    } catch (error) {
      console.error('Failed to mark as paid:', error);
      toast.error(t('finance.markPaidFailed'));
    }
  };

  const filteredRequests = requests.filter(req => 
    filterStatus === 'all' || req.status === filterStatus
  );

  const totals = {
    pending: requests.filter(r => r.status === 'pending').reduce((sum, r) => sum + parseFloat(r.amount.toString()), 0),
    approved: requests.filter(r => r.status === 'approved').reduce((sum, r) => sum + parseFloat(r.amount.toString()), 0),
    paid: requests.filter(r => r.is_paid).reduce((sum, r) => sum + parseFloat(r.amount.toString()), 0),
  };

  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-label={t('finance.loadingRequests')}>
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      {/* Summary */}
      <dl className="mb-4 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-surface-hover text-center">
        <div className="min-w-0 px-2 py-3">
          <dt className="truncate text-xs text-text-secondary">{t('finance.pending')}</dt>
          <dd className="mt-1 truncate text-base font-semibold text-text-primary">{money(totals.pending)}</dd>
          <dd className="truncate text-xs text-text-secondary">
            {t('finance.requestsCount', { count: requests.filter(r => r.status === 'pending').length })}
          </dd>
        </div>
        <div className="min-w-0 px-2 py-3">
          <dt className="truncate text-xs text-text-secondary">{t('finance.approved')}</dt>
          <dd className="mt-1 truncate text-base font-semibold text-text-primary">{money(totals.approved)}</dd>
          <dd className="truncate text-xs text-text-secondary">
            {t('finance.requestsCount', { count: requests.filter(r => r.status === 'approved').length })}
          </dd>
        </div>
        <div className="min-w-0 px-2 py-3">
          <dt className="truncate text-xs text-text-secondary">{t('finance.paid')}</dt>
          <dd className="mt-1 truncate text-base font-semibold text-text-primary">{money(totals.paid)}</dd>
          <dd className="truncate text-xs text-text-secondary">
            {t('finance.paidCount', { count: requests.filter(r => r.is_paid).length })}
          </dd>
        </div>
      </dl>

      {/* Filter */}
      <div className="-mx-1 mb-4 overflow-x-auto px-1">
        <Segmented
          label={t('finance.filterAll')}
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { value: 'all', label: t('finance.filterAll') },
            { value: 'pending', label: t('finance.pending') },
            { value: 'approved', label: t('finance.approved') },
            { value: 'rejected', label: t('finance.rejected') },
          ]}
        />
      </div>

      {/* Requests Table */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-8 text-text-secondary">
          {filterStatus === 'all'
            ? t('finance.noRequests')
            : filterStatus === 'pending'
            ? t('finance.noPendingRequests')
            : filterStatus === 'approved'
            ? t('finance.noApprovedRequests')
            : t('finance.noRejectedRequests')}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <div
              key={request.id}
              className="bg-surface border border-border rounded-xl p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h4 className="break-words text-base font-semibold text-text-primary">
                      {request.description}
                    </h4>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.status === 'pending'
                          ? 'bg-warning/10 text-warning'
                          : request.status === 'approved'
                          ? 'bg-success/10 text-success'
                          : 'bg-danger/10 text-danger'
                      }`}
                    >
                      {request.status === 'pending'
                        ? t('finance.pending')
                        : request.status === 'approved'
                        ? t('finance.approved')
                        : t('finance.rejected')}
                    </span>
                    {request.is_paid && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {t('finance.paid')}
                      </span>
                    )}
                  </div>
                  
                  {request.category && (
                    <div className="text-sm text-text-secondary mb-1">
                      {t('finance.categoryPrefix', { name: BUDGET_CATEGORY_KEYS[request.category] ? t(BUDGET_CATEGORY_KEYS[request.category]) : request.category })}
                    </div>
                  )}
                  
                  {request.justification && (
                    <div className="text-sm text-text-secondary mb-2">
                      {request.justification}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
                    <span>{t('finance.requestedBy', { name: request.requester?.username || t('finance.unknownUser') })}</span>
                    <span>•</span>
                    <span>{format(new Date(request.created_at), 'MMM d, yyyy', { locale: dateLocale })}</span>
                    {request.approved_at && (
                      <>
                        <span>•</span>
                        <span>
                          {request.status === 'approved'
                            ? t('finance.approvedBy', { name: request.approver?.username || t('finance.unknownUser') })
                            : t('finance.rejectedBy', { name: request.approver?.username || t('finance.unknownUser') })}
                        </span>
                      </>
                    )}
                  </div>

                  {request.rejection_reason && (
                    <div className="mt-2 text-sm text-danger">
                      {t('finance.rejectionReason', { reason: request.rejection_reason })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 sm:block sm:shrink-0 sm:text-right">
                  <div className="text-xl font-semibold text-text-primary sm:mb-2 sm:text-2xl">
                    {money(parseFloat(request.amount.toString()))}
                  </div>

                  {/* Action Buttons */}
                  {isOwner && request.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(request.id)}
                        className="inline-flex h-11 w-11 items-center justify-center bg-success hover:bg-success/90 active:bg-success/80 text-white rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-9 sm:w-9"
                        title={t('finance.approve')}
                        aria-label={t('finance.approve')}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        className="inline-flex h-11 w-11 items-center justify-center bg-danger hover:bg-danger/90 active:bg-danger/80 text-white rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-9 sm:w-9"
                        title={t('finance.reject')}
                        aria-label={t('finance.reject')}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {isOwner && request.status === 'approved' && !request.is_paid && (
                    <button
                      onClick={() => handleMarkPaid(request.id)}
                      className="inline-flex min-h-11 items-center px-4 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-lg text-sm transition-colors sm:min-h-9"
                    >
                      {t('finance.markAsPaid')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={rejectTarget !== null}
        title={t('finance.reject')}
        size="sm"
        onClose={() => (rejecting ? undefined : setRejectTarget(null))}
        footer={
          <>
            <Button type="button" variant="secondary" className="h-11 w-full sm:h-10 sm:w-auto" onClick={() => setRejectTarget(null)} disabled={rejecting}>
              {t('finance.cancel')}
            </Button>
            <Button type="button" variant="destructive" className="h-12 w-full sm:h-10 sm:w-auto" onClick={submitReject} loading={rejecting}>
              {t('finance.reject')}
            </Button>
          </>
        }
      >
        <label className="block text-sm text-text-secondary">
          {t('finance.rejectPrompt')}
          <Textarea className="mt-2" rows={3} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} />
        </label>
      </Dialog>
      {dialog}
    </div>
  );
}
