'use client';

import { useState, useEffect, useCallback } from 'react';
import { parseNaturalLanguageTransaction } from '@/lib/finance-parser';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTranslations } from 'next-intl';
import { useLocaleSwitch } from '@/i18n/LocaleProvider';

const FINANCE_CATEGORY_KEYS: Record<string, string> = {
  'Food & Dining': 'finance.catFoodDining',
  Transportation: 'finance.catTransportation',
  Shopping: 'finance.catShopping',
  Entertainment: 'finance.catEntertainment',
  'Bills & Utilities': 'finance.catBillsUtilities',
  Healthcare: 'finance.catHealthcare',
  Education: 'finance.catEducation',
  Travel: 'finance.catTravel',
  Business: 'finance.catBusiness',
  'Other Expense': 'finance.catOtherExpense',
  Salary: 'finance.catSalary',
  Freelance: 'finance.catFreelance',
  Investment: 'finance.catInvestment',
  'Business Income': 'finance.catBusinessIncome',
  'Other Income': 'finance.catOtherIncome',
};

interface ParsedTransaction {
  amount: number;
  description: string;
  category?: string;
  date: Date;
  type: 'income' | 'expense';
}

interface QuickAddTransactionProps {
  accountId?: string;
  onAdd: () => void;
}

export default function QuickAddTransaction({ accountId, onAdd }: QuickAddTransactionProps) {
  const t = useTranslations('pages.tools');
  const { locale } = useLocaleSwitch();
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<ParsedTransaction | null>(null);
  const [manualType, setManualType] = useState<'income' | 'expense'>('expense');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(accountId || '');
  const [categories, setCategories] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      if (data.length > 0 && !selectedAccountId) {
        setSelectedAccountId(data[0].id);
      }
    }
    setAccountsLoaded(true);
  }, [currentWorkspace?.id, selectedAccountId]);

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

  const handleInputChange = (value: string) => {
    setInput(value);
    const parsed = parseNaturalLanguageTransaction(value);
    if (parsed) {
      // Override the parsed type with manual selection
      setPreview({ ...parsed, type: manualType });
    } else {
      setPreview(null);
    }
  };

  useEffect(() => {
    setPreview((current) => {
      if (!current || current.type === manualType) return current;
      return { ...current, type: manualType };
    });
  }, [manualType]);

  const handleSubmit = async () => {
    if (!preview || !currentWorkspace?.id || !selectedAccountId) return;

    setIsSubmitting(true);
    
    try {
      // Find category ID by name
      const category = categories.find(
        c => c.name === preview.category && c.type === preview.type
      );

      const { error } = await supabase
        .from('finance_transactions')
        .insert({
          workspace_id: currentWorkspace.id,
          account_id: selectedAccountId,
          category_id: category?.id || null,
          type: preview.type,
          amount: preview.amount,
          description: preview.description,
          date: preview.date.toISOString().split('T')[0],
        });

      if (error) throw error;

      // Reset form
      setInput('');
      setPreview(null);
      onAdd();
    } catch (error) {
      console.error('Failed to add transaction:', error);
      alert(t('finance.addTransactionFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!accountsLoaded) {
    return <p className="text-sm text-text-secondary">{t('finance.loading')}</p>;
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-secondary mb-4">{t('finance.needAccount')}</p>
        <p className="text-sm text-text-secondary">{t('finance.needAccountHint')}</p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-4">
        <label className="block text-sm text-text-secondary mb-2">{t('finance.account')}</label>
        <select
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="block w-full min-w-0 px-3 py-2.5 bg-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          {accounts.map(account => (
            <option key={account.id} value={account.id}>
              {account.name} (${parseFloat(account.current_balance).toFixed(2)})
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-text-secondary mb-2">{t('finance.transactionType')}</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setManualType('expense')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              manualType === 'expense'
                ? 'bg-red-600 text-white'
                : 'border border-border bg-secondary text-text-secondary hover:bg-surface-hover'
            }`}
          >
            {t('finance.expense')}
          </button>
          <button
            type="button"
            onClick={() => setManualType('income')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              manualType === 'income'
                ? 'bg-green-600 text-white'
                : 'border border-border bg-secondary text-text-secondary hover:bg-surface-hover'
            }`}
          >
            {t('finance.income')}
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-text-secondary mb-2">{t('finance.describeTransaction')}</label>
        <input
          type="text"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={t('finance.describePlaceholder')}
          className="block w-full min-w-0 px-3 py-3 bg-secondary border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <p className="text-xs text-text-muted mt-2">
          {t('finance.describeHint')}
        </p>
      </div>

      {preview && (
        <div className="bg-surface-hover border border-border rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-text-secondary">{t('finance.preview')}</span>
            <button
              type="button"
              aria-label={t('finance.cancel')}
              onClick={() => {
                setInput('');
                setPreview(null);
              }}
              className="p-1 text-text-muted hover:text-text-secondary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-3 text-sm lg:grid-cols-2">
            <div>
              <span className="text-text-secondary">{t('finance.previewAmount')}</span>
              <span className="ml-2 text-text-primary font-medium">${preview.amount.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-text-secondary">{t('finance.previewType')}</span>
              <span className={`ml-2 font-medium ${preview.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                {preview.type === 'income' ? t('finance.income') : t('finance.expense')}
              </span>
            </div>
            <div>
              <span className="text-text-secondary">{t('finance.previewCategory')}</span>
              <span className="ml-2 text-text-primary">{preview.category ? (FINANCE_CATEGORY_KEYS[preview.category] ? t(FINANCE_CATEGORY_KEYS[preview.category]) : preview.category) : t('finance.uncategorized')}</span>
            </div>
            <div>
              <span className="text-text-secondary">{t('finance.previewDate')}</span>
              <span className="ml-2 text-text-primary">{preview.date.toLocaleDateString(locale === 'mk' ? 'mk-MK' : 'en-US')}</span>
            </div>
            <div className="lg:col-span-2">
              <span className="text-text-secondary">{t('finance.previewDescription')}</span>
              <span className="ml-2 text-text-primary">{preview.description}</span>
            </div>
          </div>
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 -mb-4 border-t border-border bg-surface px-4 py-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!preview || isSubmitting || !selectedAccountId}
          className="w-full py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
        >
          {isSubmitting ? t('finance.adding') : t('finance.addTransaction')}
        </button>
      </div>
    </div>
  );
}
