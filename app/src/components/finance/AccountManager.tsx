'use client';

import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';

interface Account {
  id?: string;
  name: string;
  type: 'bank' | 'cash' | 'credit_card' | 'investment' | 'crypto';
  currency: string;
  initial_balance: number;
  current_balance?: number;
  is_active: boolean;
}

interface AccountManagerProps {
  account?: Account;
  onClose: () => void;
  onSave: () => void;
}

export default function AccountManager({ account, onClose, onSave }: AccountManagerProps) {
  const [formData, setFormData] = useState<Account>({
    name: '',
    type: 'bank',
    currency: 'USD',
    initial_balance: 0,
    is_active: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const { currentWorkspace } = useWorkspaceStore();

  useEffect(() => {
    if (account) {
      setFormData(account);
    }
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id) return;

    setIsSaving(true);

    try {
      if (account?.id) {
        // Update existing account
        const { error } = await supabase
          .from('finance_accounts')
          .update({
            name: formData.name,
            type: formData.type,
            is_active: formData.is_active,
          })
          .eq('id', account.id);

        if (error) throw error;
      } else {
        // Create new account
        const { error } = await supabase
          .from('finance_accounts')
          .insert({
            workspace_id: currentWorkspace.id,
            name: formData.name,
            type: formData.type,
            currency: formData.currency,
            initial_balance: formData.initial_balance,
            current_balance: formData.initial_balance,
            is_active: formData.is_active,
          });

        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save account:', error);
      alert('Failed to save account. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface/90 border border-white/10 rounded-2xl max-w-md w-full mt-20 sm:mt-0 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">
            {account ? 'Edit Account' : 'Create Account'}
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-2">
              Account Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Main Checking, Savings, Cash Wallet"
              className="w-full px-4 py-2 bg-surface border border-white/10 rounded-lg text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-2">
              Account Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as Account['type'] })}
              className="w-full px-4 py-2 bg-surface border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            >
              <option value="bank">Bank Account</option>
              <option value="cash">Cash</option>
              <option value="credit_card">Credit Card</option>
              <option value="investment">Investment</option>
              <option value="crypto">Cryptocurrency</option>
            </select>
          </div>

          {!account && (
            <>
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-4 py-2 bg-surface border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                  <option value="CNY">CNY - Chinese Yuan</option>
                  <option value="CHF">CHF - Swiss Franc</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                  <option value="NZD">NZD - New Zealand Dollar</option>
                  <option value="SGD">SGD - Singapore Dollar</option>
                  <option value="HKD">HKD - Hong Kong Dollar</option>
                  <option value="SEK">SEK - Swedish Krona</option>
                  <option value="NOK">NOK - Norwegian Krone</option>
                  <option value="DKK">DKK - Danish Krone</option>
                  <option value="KRW">KRW - South Korean Won</option>
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="MXN">MXN - Mexican Peso</option>
                  <option value="BRL">BRL - Brazilian Real</option>
                  <option value="ZAR">ZAR - South African Rand</option>
                  <option value="TRY">TRY - Turkish Lira</option>
                  <option value="RUB">RUB - Russian Ruble</option>
                  <option value="PLN">PLN - Polish Złoty</option>
                  <option value="THB">THB - Thai Baht</option>
                  <option value="MYR">MYR - Malaysian Ringgit</option>
                  <option value="IDR">IDR - Indonesian Rupiah</option>
                  <option value="AED">AED - UAE Dirham</option>
                  <option value="SAR">SAR - Saudi Riyal</option>
                  <option value="MKD">MKD - Macedonian Denar</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Initial Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.initial_balance}
                  onChange={(e) => setFormData({ ...formData, initial_balance: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full px-4 py-2 bg-surface border border-white/10 rounded-lg text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <p className="text-xs text-text-muted mt-1">
                  The current balance when you start tracking
                </p>
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-white/10 bg-surface text-primary focus:ring-primary/40"
            />
            <label htmlFor="is_active" className="text-sm text-text-secondary">
              Active account
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-surface hover:bg-surface-hover text-white rounded-lg border border-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2 px-4 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isSaving ? 'Saving...' : account ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
