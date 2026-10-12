'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTranslations } from 'next-intl';
import { Dialog } from '@/components/ui/Dialog';

const CURRENCIES = [
  ['USD', 'finance.curUsd'],
  ['EUR', 'finance.curEur'],
  ['GBP', 'finance.curGbp'],
  ['JPY', 'finance.curJpy'],
  ['CNY', 'finance.curCny'],
  ['CHF', 'finance.curChf'],
  ['CAD', 'finance.curCad'],
  ['AUD', 'finance.curAud'],
  ['NZD', 'finance.curNzd'],
  ['SGD', 'finance.curSgd'],
  ['HKD', 'finance.curHkd'],
  ['SEK', 'finance.curSek'],
  ['NOK', 'finance.curNok'],
  ['DKK', 'finance.curDkk'],
  ['KRW', 'finance.curKrw'],
  ['INR', 'finance.curInr'],
  ['MXN', 'finance.curMxn'],
  ['BRL', 'finance.curBrl'],
  ['ZAR', 'finance.curZar'],
  ['TRY', 'finance.curTry'],
  ['RUB', 'finance.curRub'],
  ['PLN', 'finance.curPln'],
  ['THB', 'finance.curThb'],
  ['MYR', 'finance.curMyr'],
  ['IDR', 'finance.curIdr'],
  ['AED', 'finance.curAed'],
  ['SAR', 'finance.curSar'],
  ['MKD', 'finance.curMkd'],
] as const;

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

const fieldClass = 'block w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40';

export default function AccountManager({ account, onClose, onSave }: AccountManagerProps) {
  const t = useTranslations('pages.tools');
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
      alert(t('finance.saveAccountFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open
      title={account ? t('finance.editAccount') : t('finance.createAccount')}
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-hover"
          >
            {t('finance.cancel')}
          </button>
          <button
            type="submit"
            form="account-form"
            disabled={isSaving}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? t('finance.saving') : account ? t('finance.update') : t('finance.create')}
          </button>
        </div>
      }
    >
      <form id="account-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-text-secondary" htmlFor="account-name">
            {t('finance.accountName')}
          </label>
          <input
            id="account-name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t('finance.accountNamePlaceholder')}
            className={fieldClass}
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-text-secondary" htmlFor="account-type">
            {t('finance.accountType')}
          </label>
          <select
            id="account-type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as Account['type'] })}
            className={fieldClass}
            required
          >
            <option value="bank">{t('finance.typeBank')}</option>
            <option value="cash">{t('finance.typeCash')}</option>
            <option value="credit_card">{t('finance.typeCreditCard')}</option>
            <option value="investment">{t('finance.typeInvestment')}</option>
            <option value="crypto">{t('finance.typeCrypto')}</option>
          </select>
        </div>

        {!account && (
          <>
            <div>
              <label className="mb-1.5 block text-sm text-text-secondary" htmlFor="account-currency">
                {t('finance.currency')}
              </label>
              <select
                id="account-currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className={fieldClass}
              >
                {CURRENCIES.map(([value, labelKey]) => (
                  <option key={value} value={value}>{t(labelKey)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-text-secondary" htmlFor="account-balance">
                {t('finance.initialBalance')}
              </label>
              <input
                id="account-balance"
                type="number"
                step="0.01"
                value={formData.initial_balance}
                onChange={(e) => setFormData({ ...formData, initial_balance: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className={fieldClass}
              />
              <p className="mt-1 text-xs text-text-muted">{t('finance.initialBalanceHint')}</p>
            </div>
          </>
        )}

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="h-4 w-4 rounded border-border bg-surface text-primary focus:ring-primary/40"
          />
          <label htmlFor="is_active" className="text-sm text-text-secondary">
            {t('finance.activeAccount')}
          </label>
        </div>
      </form>
    </Dialog>
  );
}
