'use client';

import { useEffect, useState, useCallback } from 'react';
import { Check, X, Clock, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

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
      alert('Failed to approve request');
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt('Reason for rejection (optional):');
    
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
      alert('Failed to reject request');
    }
  };

  const handleMarkPaid = async (requestId: string) => {
    if (!confirm('Mark this expense as paid?')) return;

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
      alert('Failed to mark as paid');
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
    return <div className="text-slate-400">Loading budget requests...</div>;
  }

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-slate-400">Pending</span>
          </div>
          <div className="text-2xl font-bold text-white">
            ${totals.pending.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {requests.filter(r => r.status === 'pending').length} requests
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-slate-400">Approved</span>
          </div>
          <div className="text-2xl font-bold text-white">
            ${totals.approved.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {requests.filter(r => r.status === 'approved').length} requests
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-slate-400">Paid</span>
          </div>
          <div className="text-2xl font-bold text-white">
            ${totals.paid.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {requests.filter(r => r.is_paid).length} paid
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Requests Table */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          No {filterStatus !== 'all' ? filterStatus : ''} budget requests
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <div
              key={request.id}
              className="bg-slate-800 border border-slate-700 rounded-xl p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold text-white">
                      {request.description}
                    </h4>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-500'
                          : request.status === 'approved'
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}
                    >
                      {request.status}
                    </span>
                    {request.is_paid && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500">
                        Paid
                      </span>
                    )}
                  </div>
                  
                  {request.category && (
                    <div className="text-sm text-slate-400 mb-1">
                      Category: {request.category}
                    </div>
                  )}
                  
                  {request.justification && (
                    <div className="text-sm text-slate-300 mb-2">
                      {request.justification}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Requested by {request.requester?.username || 'Unknown'}</span>
                    <span>•</span>
                    <span>{format(new Date(request.created_at), 'MMM d, yyyy')}</span>
                    {request.approved_at && (
                      <>
                        <span>•</span>
                        <span>
                          {request.status === 'approved' ? 'Approved' : 'Rejected'} by {request.approver?.username || 'Unknown'}
                        </span>
                      </>
                    )}
                  </div>

                  {request.rejection_reason && (
                    <div className="mt-2 text-sm text-red-400">
                      Rejection reason: {request.rejection_reason}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-white mb-2">
                    ${parseFloat(request.amount.toString()).toLocaleString()}
                  </div>

                  {/* Action Buttons */}
                  {isOwner && request.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(request.id)}
                        className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {isOwner && request.status === 'approved' && !request.is_paid && (
                    <button
                      onClick={() => handleMarkPaid(request.id)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                    >
                      Mark as Paid
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
