'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { enUS, mk } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import { useLocaleSwitch } from '@/i18n/LocaleProvider';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { Dialog } from '@/components/ui/Dialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { IconMenu } from '@/components/ui/IconMenu';
import AccountManager from '@/components/finance/AccountManager';
import QuickAddTransaction from '@/components/finance/QuickAddTransaction';
import ImportTransactions from '@/components/finance/ImportTransactions';
import GoalsDashboard from '@/components/finance/GoalsDashboard';

const FINANCE_CATEGORY_KEYS: Record<string, string> = {
  'Food & Dining': 'finance.catFoodDining',
  'Transportation': 'finance.catTransportation',
  'Shopping': 'finance.catShopping',
  'Entertainment': 'finance.catEntertainment',
  'Bills & Utilities': 'finance.catBillsUtilities',
  'Healthcare': 'finance.catHealthcare',
  'Education': 'finance.catEducation',
  'Travel': 'finance.catTravel',
  'Business': 'finance.catBusiness',
  'Other Expense': 'finance.catOtherExpense',
  'Salary': 'finance.catSalary',
  'Freelance': 'finance.catFreelance',
  'Investment': 'finance.catInvestment',
  'Business Income': 'finance.catBusinessIncome',
  'Other Income': 'finance.catOtherIncome',
};

const ACCOUNT_TYPE_KEYS: Record<string, string> = {
  bank: 'finance.typeBank',
  cash: 'finance.typeCash',
  credit_card: 'finance.typeCreditCard',
  investment: 'finance.typeInvestment',
  crypto: 'finance.typeCrypto',
};

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#14b8a6'];

interface Account {
  id: string;
  name: string;
  type: string;
  current_balance: number;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  date: string;
  category: {
    name: string;
    color: string;
  } | null;
}

interface Stats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netIncome: number;
}

function formatMoney(value: number) {
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `-$${formatted}` : `$${formatted}`;
}

export default function FinancePage() {
  const t = useTranslations('pages.tools');
  const { locale } = useLocaleSwitch();
  const dateLocale = locale === 'mk' ? mk : enUS;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    netIncome: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'goals'>('overview');
  const { currentWorkspace } = useWorkspaceStore();

  const loadFinanceData = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    setLoading(true);

    try {
      const accountsRes = await fetch(`/api/finance?workspace_id=${currentWorkspace.id}&type=accounts`);
      const accountsJson = await accountsRes.json();

      if (accountsJson.accounts) {
        setAccounts(accountsJson.accounts);
        const total = accountsJson.accounts.reduce((sum: number, acc: Account) => sum + parseFloat(acc.current_balance.toString()), 0);
        setStats(prev => ({ ...prev, totalBalance: total }));
      }

      const startDate = startOfMonth(new Date()).toISOString().split('T')[0];
      const endDate = endOfMonth(new Date()).toISOString().split('T')[0];

      const transRes = await fetch(`/api/finance?workspace_id=${currentWorkspace.id}&type=transactions&start_date=${startDate}&end_date=${endDate}`);
      const transJson = await transRes.json();

      if (transJson.transactions) {
        setTransactions(transJson.transactions);

        const income = transJson.transactions
          .filter((item: Transaction) => item.type === 'income')
          .reduce((sum: number, item: Transaction) => sum + parseFloat(item.amount.toString()), 0);

        const expenses = transJson.transactions
          .filter((item: Transaction) => item.type === 'expense')
          .reduce((sum: number, item: Transaction) => sum + parseFloat(item.amount.toString()), 0);

        setStats(prev => ({
          ...prev,
          monthlyIncome: income,
          monthlyExpenses: expenses,
          netIncome: income - expenses,
        }));
      }
    } catch (error) {
      console.error('Error loading finance data:', error);
    }

    setLoading(false);
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadFinanceData();
    }
  }, [currentWorkspace?.id, loadFinanceData]);

  const categoryData = transactions
    .filter(item => item.type === 'expense' && item.category)
    .reduce((acc, item) => {
      const cat = item.category!.name;
      acc[cat] = (acc[cat] || 0) + parseFloat(item.amount.toString());
      return acc;
    }, {} as Record<string, number>);

  const categoryName = (name?: string | null) => {
    if (!name) return t('finance.uncategorized');
    const key = FINANCE_CATEGORY_KEYS[name];
    return key ? t(key) : name;
  };

  const pieData = Object.entries(categoryData).map(([name, value]) => ({
    name: categoryName(name),
    value,
  }));

  const accountTypeLabel = (type: string) =>
    ACCOUNT_TYPE_KEYS[type] ? t(ACCOUNT_TYPE_KEYS[type]) : type.replace('_', ' ');

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-text-secondary">
        {t('finance.loading')}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title={t('finance.title')}
        description={t('finance.subtitle')}
        action={
          activeTab === 'overview' ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowTransactionModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              >
                <Plus className="h-4 w-4" />
                {t('finance.addTransaction')}
              </button>
              <IconMenu
                label={t('finance.moreActions')}
                items={[
                  {
                    label: t('finance.importCsv'),
                    onClick: () => {
                      if (accounts.length === 0) {
                        setShowAccountModal(true);
                        return;
                      }
                      setShowImportModal(true);
                    },
                  },
                  { label: t('finance.addAccount'), onClick: () => setShowAccountModal(true) },
                ]}
              />
            </div>
          ) : undefined
        }
      />

      <p className="text-sm text-text-primary">
        {t('finance.summaryLine', {
          balance: formatMoney(stats.totalBalance),
          net: formatMoney(stats.netIncome),
        })}
      </p>

      <div role="tablist" className="grid w-full grid-cols-2 gap-1 rounded-xl bg-surface-hover p-1 sm:inline-grid sm:w-auto">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            activeTab === 'overview'
              ? 'bg-surface text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {t('finance.tabOverview')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'goals'}
          onClick={() => setActiveTab('goals')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            activeTab === 'goals'
              ? 'bg-surface text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {t('finance.tabGoals')}
        </button>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface p-4">
              <h2 className="text-base font-semibold text-text-primary">{t('finance.spendingByCategory')}</h2>
              {pieData.length > 0 ? (
                <>
                  <div className="mx-auto mt-2 h-[220px] w-full max-w-full sm:h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="78%" label={false}>
                          {pieData.map((entry, index) => (
                            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => `${Number(value).toFixed(2)}`}
                          contentStyle={{
                            backgroundColor: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            color: 'var(--text-primary)',
                          }}
                          itemStyle={{ color: 'var(--text-primary)' }}
                          labelStyle={{ color: 'var(--text-primary)' }}
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {pieData.map((entry, index) => (
                      <li key={entry.name} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2 text-text-primary">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="truncate">{entry.name}</span>
                        </span>
                        <span className="shrink-0 text-text-primary">${entry.value.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-sm text-text-secondary">
                  {t('finance.noExpenseData')}
                </div>
              )}
            </section>

            <section className="min-w-0 rounded-2xl border border-border bg-surface p-4">
              <h2 className="mb-3 text-base font-semibold text-text-primary">{t('finance.recentTransactions')}</h2>
              {transactions.length > 0 ? (
                <ul className="space-y-2 lg:max-h-[28rem] lg:overflow-y-auto">
                  {transactions.slice(0, 10).map(transaction => (
                    <li key={transaction.id} className="rounded-xl border border-border bg-surface p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            transaction.type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10'
                          }`}>
                            {transaction.type === 'income' ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="break-words font-medium text-text-primary">{transaction.description}</p>
                            <p className="mt-0.5 text-sm text-text-secondary">
                              {categoryName(transaction.category?.name)} · {format(new Date(transaction.date), 'MMM d', { locale: dateLocale })}
                            </p>
                          </div>
                        </div>
                        <p className={`shrink-0 text-sm font-semibold ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}${parseFloat(transaction.amount.toString()).toFixed(2)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-8 text-center text-sm text-text-secondary">{t('finance.noTransactions')}</p>
              )}
            </section>
          </div>

          <section className="min-w-0 rounded-2xl border border-border bg-surface p-4">
            <h2 className="mb-3 text-base font-semibold text-text-primary">{t('finance.accounts')}</h2>
            {accounts.length > 0 ? (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {accounts.map(account => (
                  <li key={account.id} className="rounded-xl border border-border bg-surface-hover p-4">
                    <p className="break-words text-sm text-text-secondary">{account.name}</p>
                    <p className="mt-1 text-xl font-semibold text-text-primary">
                      {formatMoney(parseFloat(account.current_balance.toString()))}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">{accountTypeLabel(account.type)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center">
                <p className="mb-4 text-sm text-text-secondary">{t('finance.noAccounts')}</p>
                <button
                  type="button"
                  onClick={() => setShowAccountModal(true)}
                  className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-hover"
                >
                  {t('finance.createFirstAccount')}
                </button>
              </div>
            )}
          </section>
        </div>
      ) : (
        <GoalsDashboard />
      )}

      {showAccountModal && (
        <AccountManager
          onClose={() => setShowAccountModal(false)}
          onSave={() => {
            setShowAccountModal(false);
            loadFinanceData();
          }}
        />
      )}

      <Dialog
        open={showTransactionModal}
        title={t('finance.addTransaction')}
        onClose={() => setShowTransactionModal(false)}
        size="lg"
      >
        <QuickAddTransaction
          accountId={accounts[0]?.id}
          onAdd={() => {
            setShowTransactionModal(false);
            loadFinanceData();
          }}
        />
      </Dialog>

      {showImportModal && accounts.length > 0 && (
        <ImportTransactions
          accountId={accounts[0].id}
          onImport={() => {
            loadFinanceData();
          }}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
}
