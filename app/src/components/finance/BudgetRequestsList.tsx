'use client';

import { useEffect, useState, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { enUS, mk } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import { useLocaleSwitch } from '@/i18n/LocaleProvider';

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
  const { locale } = useLocaleSwitch();
  const dateLocale = locale === 'mk' ? mk : enUS;
  const [requests, setRequests] = useState<BudgetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
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
      const { data: { user } } = await supabase.auth.getUser();
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
      alert(t('finance.approveFailed'));
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt(t('finance.rejectPrompt'));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
    } catch (error) {
      console.error('Failed to reject request:', error);
      alert(t('finance.rejectFailed'));
    }
  };

  const handleMarkPaid = async (requestId: string) => {
    if (!confirm(t('finance.markPaidConfirm'))) return;

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
      alert(t('finance.markPaidFailed'));
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
    return <div className="text-text-secondary">{t('finance.loadingRequests')}</div>;
  }

  return (
    <div>
      {/* Summary */}
      <dl className="mb-4 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-surface-hover text-center">
        <div className="min-w-0 px-2 py-3">
          <dt className="truncate text-xs text-text-secondary">{t('finance.pending')}</dt>
          <dd className="mt-1 truncate text-base font-semibold text-text-primary">${totals.pending.toLocaleString()}</dd>
          <dd className="truncate text-xs text-text-secondary">
            {t('finance.requestsCount', { count: requests.filter(r => r.status === 'pending').length })}
          </dd>
        </div>
        <div className="min-w-0 px-2 py-3">
          <dt className="truncate text-xs text-text-secondary">{t('finance.approved')}</dt>
          <dd className="mt-1 truncate text-base font-semibold text-text-primary">${totals.approved.toLocaleString()}</dd>
          <dd className="truncate text-xs text-text-secondary">
            {t('finance.requestsCount', { count: requests.filter(r => r.status === 'approved').length })}
          </dd>
        </div>
        <div className="min-w-0 px-2 py-3">
          <dt className="truncate text-xs text-text-secondary">{t('finance.paid')}</dt>
          <dd className="mt-1 truncate text-base font-semibold text-text-primary">${totals.paid.toLocaleString()}</dd>
          <dd className="truncate text-xs text-text-secondary">
            {t('finance.paidCount', { count: requests.filter(r => r.is_paid).length })}
          </dd>
        </div>
      </dl>

      {/* Filter Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === status
                ? 'bg-primary text-white'
                : 'bg-secondary text-text-secondary hover:bg-surface-hover border border-border'
            }`}
          >
            {status === 'all'
              ? t('finance.filterAll')
              : status === 'pending'
              ? t('finance.pending')
              : status === 'approved'
              ? t('finance.approved')
              : t('finance.rejected')}
          </button>
        ))}
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
              className="bg-secondary border border-border rounded-xl p-4"
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
                    ${parseFloat(request.amount.toString()).toLocaleString()}
                  </div>

                  {/* Action Buttons */}
                  {isOwner && request.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(request.id)}
                        className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        title={t('finance.approve')}
                        aria-label={t('finance.approve')}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
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
                      className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm transition-colors"
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
    </div>
  );
}
