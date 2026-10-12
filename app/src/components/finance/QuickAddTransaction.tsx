'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { enUS, mk } from 'date-fns/locale';
import { Link2 } from 'lucide-react';
import { parseNaturalLanguageTransaction } from '@/lib/finance-parser';
import { supabase } from '@/lib/supabase';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTranslations } from 'next-intl';
import { useLocaleSwitch } from '@/i18n/LocaleProvider';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Segmented } from '@/components/tools/Segmented';
import { FINANCE_CATEGORY_KEYS, formatMoney, toNumber } from './money';

interface ParsedTransaction {
  amount: number;
  description: string;
  category?: string;
  date: Date;
  type: 'income' | 'expense';
}

interface QuickAddTransactionProps {
  accountId?: string;
  defaultType?: 'income' | 'expense';
  projectId?: string | null;
  onClose: () => void;
  onAdd: () => void;
}

const fieldClass =
  'block w-full min-w-0 rounded-lg border border-border bg-secondary px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30';

export default function QuickAddTransaction({
  accountId,
  defaultType = 'expense',
  projectId = null,
  onClose,
  onAdd,
}: QuickAddTransactionProps) {
  const t = useTranslations('pages.tools');
  const { locale } = useLocaleSwitch();
  const dateLocale = locale === 'mk' ? mk : enUS;
  const [input, setInput] = useState('');
  const [manualType, setManualType] = useState<'income' | 'expense'>(defaultType);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(accountId || '');
  const [categories, setCategories] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentWorkspace } = useWorkspaceStore();

  const loadAccounts = useCallback(async () => {
    if (!currentWorkspace?.id) {
      setAccountsLoaded(true);
      return;
    }

    const { data } = await supabase
      .from('finance_accounts')
      .select('*')
      .eq('workspace_id', currentWorkspace.id)
      .eq('is_active', true)
      .order('name');

    if (data) {
      setAccounts(data);
      setSelectedAccountId((current) => current || data[0]?.id || '');
    }
    setAccountsLoaded(true);
  }, [currentWorkspace?.id]);

  const loadCategories = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    const { data } = await supabase
      .from('finance_categories')
      .select('*')
      .or(`workspace_id.eq.${currentWorkspace.id},is_system.eq.true`)
      .order('name');

    if (data) setCategories(data);
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadAccounts();
      loadCategories();
    } else {
      setAccountsLoaded(true);
    }
  }, [currentWorkspace?.id, loadAccounts, loadCategories]);

  const parsed = parseNaturalLanguageTransaction(input);
  const preview: ParsedTransaction | null = parsed ? { ...parsed, type: manualType } : null;
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);
  const currency = selectedAccount?.currency || 'USD';

  const categoryLabel = (name?: string) =>
    name ? (FINANCE_CATEGORY_KEYS[name] ? t(FINANCE_CATEGORY_KEYS[name]) : name) : t('finance.uncategorized');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!preview || !currentWorkspace?.id || !selectedAccountId || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const category = categories.find((c) => c.name === preview.category && c.type === preview.type);

      const { error: insertError } = await supabase.from('finance_transactions').insert({
        workspace_id: currentWorkspace.id,
        account_id: selectedAccountId,
        category_id: category?.id || null,
        project_id: projectId || null,
        type: preview.type,
        amount: preview.amount,
        description: preview.description,
        date: format(preview.date, 'yyyy-MM-dd'),
      });

      if (insertError) throw insertError;

      onAdd();
    } catch (err) {
      console.error('Failed to add transaction:', err);
      setError(t('finance.addTransactionFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const noAccounts = accountsLoaded && accounts.length === 0;

  return (
    <Dialog
      open
      title={t('finance.addTransaction')}
      onClose={onClose}
      footer={
        noAccounts ? (
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            {t('finance.close')}
          </Button>
        ) : (
          <Button
            type="submit"
            form="quick-add-form"
            fullWidth
            disabled={!preview || isSubmitting || !selectedAccountId}
          >
            {isSubmitting ? t('finance.adding') : t('finance.addTransaction')}
          </Button>
        )
      }
    >
      {!accountsLoaded ? (
        <p className="py-6 text-center text-sm text-text-secondary">{t('finance.loading')}</p>
      ) : noAccounts ? (
        <div className="py-6 text-center">
          <p className="font-medium text-text-primary">{t('finance.needAccount')}</p>
          <p className="mt-1 text-sm text-text-secondary">{t('finance.needAccountHint')}</p>
        </div>
      ) : (
        <form id="quick-add-form" onSubmit={handleSubmit} className="min-w-0 space-y-4">
          <Segmented
            fullWidth
            label={t('finance.transactionType')}
            value={manualType}
            onChange={setManualType}
            options={[
              { value: 'expense', label: t('finance.expense') },
              { value: 'income', label: t('finance.income') },
            ]}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary" htmlFor="quick-add-input">
              {t('finance.describeTransaction')}
            </label>
            <input
              id="quick-add-input"
              type="text"
              autoFocus
              autoComplete="off"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('finance.describePlaceholder')}
              className={`${fieldClass} py-3 text-base`}
            />
            <p className="mt-1.5 text-xs text-text-muted">{t('finance.describeHint')}</p>
          </div>

          <div
            aria-live="polite"
            className={`rounded-xl border px-4 py-3 ${
              preview ? 'border-border bg-surface-hover' : 'border-dashed border-border'
            }`}
          >
            {preview ? (
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="break-words font-medium text-text-primary">{preview.description}</p>
                  <p className="mt-0.5 text-sm text-text-secondary">
                    {categoryLabel(preview.category)} · {format(preview.date, 'PP', { locale: dateLocale })}
                  </p>
                </div>
                <p
                  className={`shrink-0 text-lg font-semibold tabular-nums ${
                    preview.type === 'income' ? 'text-success' : 'text-danger'
                  }`}
                >
                  {preview.type === 'income' ? '+' : '-'}
                  {formatMoney(preview.amount, currency, locale)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-muted">{t('finance.previewEmpty')}</p>
            )}
          </div>

          {accounts.length > 1 ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary" htmlFor="quick-add-account">
                {t('finance.account')}
              </label>
              <select
                id="quick-add-account"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className={fieldClass}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({formatMoney(toNumber(account.current_balance), account.currency || 'USD', locale)})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">
              {t('finance.account')}: <span className="font-medium text-text-primary">{selectedAccount?.name}</span>
            </p>
          )}

          {projectId ? (
            <p className="flex items-center gap-2 text-sm text-text-secondary">
              <Link2 className="h-4 w-4 shrink-0" />
              {t('finance.linkedToProject')}
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
        </form>
      )}
    </Dialog>
  );
}
