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
import { Skeleton } from '@/components/ui/Skeleton';
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
  'block w-full min-w-0 rounded-lg border border-border-control bg-secondary px-3 text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30';

/** "12,50" and "12.50" both work on phone keypads that only offer one separator. */
function parseAmount(value: string) {
  const parsed = parseFloat(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : null;
}

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
  const [amountText, setAmountText] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
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

  // A category picked for the other type no longer applies after switching expense/income.
  useEffect(() => {
    setCategoryId((current) => {
      if (!current) return current;
      const match = categories.find((category) => category.id === current);
      return match && match.type === manualType ? current : null;
    });
  }, [manualType, categories]);

  const typedCategories = categories.filter((category) => category.type === manualType);
  const pickedCategory = categoryId ? categories.find((category) => category.id === categoryId) : undefined;

  // The amount field wins when filled; otherwise the sentence is parsed as before ("coffee 5 yesterday").
  const parsed = parseNaturalLanguageTransaction(input);
  const typedAmount = parseAmount(amountText);
  let preview: ParsedTransaction | null = null;
  if (typedAmount !== null) {
    preview = {
      amount: typedAmount,
      description: parsed?.description || input.trim() || (manualType === 'income' ? 'Income' : 'Expense'),
      category: pickedCategory?.name ?? parsed?.category,
      date: parsed?.date ?? new Date(),
      type: manualType,
    };
  } else if (parsed) {
    preview = { ...parsed, category: pickedCategory?.name ?? parsed.category, type: manualType };
  }
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
      const category =
        pickedCategory ?? categories.find((c) => c.name === preview.category && c.type === preview.type);

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
          <Button type="button" variant="secondary" fullWidth className="h-11 sm:h-10" onClick={onClose}>
            {t('finance.close')}
          </Button>
        ) : (
          <Button
            type="submit"
            form="quick-add-form"
            fullWidth
            className="h-12 sm:h-10"
            disabled={!preview || isSubmitting || !selectedAccountId}
          >
            {isSubmitting ? t('finance.adding') : t('finance.addTransaction')}
          </Button>
        )
      }
    >
      {!accountsLoaded ? (
        <div className="space-y-3 py-2" role="status" aria-busy="true">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      ) : noAccounts ? (
        <div className="py-6 text-center">
          <p className="font-medium text-text-primary">{t('finance.needAccount')}</p>
          <p className="mt-1 text-sm text-text-secondary">{t('finance.needAccountHint')}</p>
        </div>
      ) : (
        <form id="quick-add-form" onSubmit={handleSubmit} className="min-w-0 space-y-5">
          <Segmented
            fullWidth
            large
            label={t('finance.transactionType')}
            value={manualType}
            onChange={setManualType}
            options={[
              { value: 'expense', label: t('finance.expense') },
              { value: 'income', label: t('finance.income') },
            ]}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary" htmlFor="quick-add-amount">
              {t('finance.amount')}
            </label>
            <div className="relative">
              <input
                id="quick-add-amount"
                type="text"
                inputMode="decimal"
                enterKeyHint="next"
                autoComplete="off"
                autoFocus
                value={amountText}
                onChange={(e) => setAmountText(e.target.value.replace(/[^\d.,\s]/g, ''))}
                placeholder="0.00"
                className={`${fieldClass} h-16 pr-16 text-3xl font-semibold tabular-nums`}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-text-muted"
              >
                {currency}
              </span>
            </div>
          </div>

          {typedCategories.length > 0 ? (
            <fieldset>
              <legend className="mb-1.5 block text-sm font-medium text-text-secondary">{t('finance.fieldCategory')}</legend>
              <div className="flex flex-wrap gap-2">
                {typedCategories.map((category) => {
                  const selected = categoryId === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setCategoryId(selected ? null : category.id)}
                      className={`inline-flex min-h-11 max-w-full items-center rounded-full border px-4 text-sm font-medium transition-colors active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        selected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border-strong bg-surface text-text-secondary hover:bg-surface-hover'
                      }`}
                    >
                      <span className="truncate">{categoryLabel(category.name)}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary" htmlFor="quick-add-input">
              {t('finance.describeTransaction')}
            </label>
            <input
              id="quick-add-input"
              type="text"
              enterKeyHint="done"
              autoComplete="off"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('finance.describePlaceholder')}
              className={`${fieldClass} h-12 text-base`}
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
                className={`${fieldClass} h-12 text-base`}
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
