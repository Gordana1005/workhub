'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  endOfMonth,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfYear,
  subMonths,
} from 'date-fns';
import { enUS, mk } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import { useLocaleSwitch } from '@/i18n/LocaleProvider';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconMenu } from '@/components/ui/IconMenu';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/tools/Segmented';
import { ChartTooltip, OTHER_COLOR, useSeriesColors } from '@/components/tools/chart';
import AccountManager from '@/components/finance/AccountManager';
import GoalsDashboard from '@/components/finance/GoalsDashboard';
import ImportTransactions from '@/components/finance/ImportTransactions';
import PendingBudgetRequests from '@/components/finance/PendingBudgetRequests';
import QuickAddTransaction from '@/components/finance/QuickAddTransaction';
import { FINANCE_CATEGORY_KEYS, formatMoney, toNumber } from '@/components/finance/money';

const ACCOUNT_TYPE_KEYS: Record<string, string> = {
  bank: 'finance.typeBank',
  cash: 'finance.typeCash',
  credit_card: 'finance.typeCreditCard',
  investment: 'finance.typeInvestment',
  crypto: 'finance.typeCrypto',
};

type Period = 'month' | 'lastMonth' | 'quarter' | 'year' | 'all';
type TypeFilter = 'all' | 'income' | 'expense';

const PAGE_SIZE = 40;
const MAX_SLICES = 7;
const UNCATEGORIZED = '__none__';

interface Account {
  id: string;
  name: string;
  type: string;
  currency?: string;
  initial_balance?: number;
  current_balance: number;
  is_active?: boolean;
}

interface Transaction {
  id: string;
  account_id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  date: string;
  category: {
    name: string;
    color: string;
  } | null;
}

function periodRange(period: Period) {
  const now = new Date();
  const fmt = (date: Date) => format(date, 'yyyy-MM-dd');
  switch (period) {
    case 'month':
      return { start: fmt(startOfMonth(now)), end: fmt(endOfMonth(now)) };
    case 'lastMonth': {
      const last = subMonths(now, 1);
      return { start: fmt(startOfMonth(last)), end: fmt(endOfMonth(last)) };
    }
    case 'quarter':
      return { start: fmt(startOfMonth(subMonths(now, 2))), end: fmt(endOfMonth(now)) };
    case 'year':
      return { start: fmt(startOfYear(now)), end: fmt(endOfYear(now)) };
    default:
      return { start: null, end: null };
  }
}

export default function FinancePage() {
  const t = useTranslations('pages.tools');
  const tc = useTranslations('common');
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const { locale } = useLocaleSwitch();
  const dateLocale = locale === 'mk' ? mk : enUS;
  const { currentWorkspace } = useWorkspaceStore();
  const palette = useSeriesColors();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [period, setPeriod] = useState<Period>('month');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [accountDialog, setAccountDialog] = useState<{ open: boolean; account?: Account }>({ open: false });
  const [quickAdd, setQuickAdd] = useState<{ open: boolean; type: 'income' | 'expense'; projectId: string | null }>({
    open: false,
    type: 'expense',
    projectId: null,
  });
  const [showImport, setShowImport] = useState(false);

  const requestId = useRef(0);
  const workspaceId = currentWorkspace?.id;

  const loadFinanceData = useCallback(async () => {
    if (!workspaceId) return;
    const current = ++requestId.current;
    setRefreshing(true);
    setLoadError(false);

    try {
      const { start, end } = periodRange(period);
      const range = start && end ? `&start_date=${start}&end_date=${end}` : '';
      const [accountsRes, transactionsRes] = await Promise.all([
        fetch(`/api/finance?workspace_id=${workspaceId}&type=accounts`),
        fetch(`/api/finance?workspace_id=${workspaceId}&type=transactions${range}`),
      ]);
      const accountsJson = await accountsRes.json();
      const transactionsJson = await transactionsRes.json();
      if (current !== requestId.current) return;
      if (!accountsRes.ok || !transactionsRes.ok) throw new Error('finance request failed');

      setAccounts(accountsJson.accounts || []);
      setTransactions(transactionsJson.transactions || []);
    } catch (error) {
      if (current !== requestId.current) return;
      console.error('Error loading finance data:', error);
      setLoadError(true);
    } finally {
      if (current === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [workspaceId, period]);

  // A different workspace means different data: start from a clean slate.
  useEffect(() => {
    setAccounts([]);
    setTransactions([]);
    setLoading(true);
    setAccountFilter('all');
    setCategoryFilter('all');
  }, [workspaceId]);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  // The project budget card links here with ?type=expense|income&project=<id> to start a quick add.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    if (type === 'expense' || type === 'income') {
      setQuickAdd({ open: true, type, projectId: params.get('project') });
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [period, typeFilter, accountFilter, categoryFilter, query]);

  const accountMap = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);

  // One display currency for totals: the accounts' shared currency, otherwise USD.
  const baseCurrency = useMemo(() => {
    const currencies = new Set(accounts.map((account) => account.currency || 'USD'));
    return currencies.size === 1 ? Array.from(currencies)[0] : 'USD';
  }, [accounts]);

  const money = useCallback(
    (value: number, currency?: string) => formatMoney(value, currency || baseCurrency, locale),
    [baseCurrency, locale]
  );

  const categoryName = useCallback(
    (name?: string | null) => {
      if (!name) return t('finance.uncategorized');
      const key = FINANCE_CATEGORY_KEYS[name];
      return key ? t(key) : name;
    },
    [t]
  );

  const categoryOptions = useMemo(() => {
    const names = new Set<string>();
    let hasNone = false;
    transactions.forEach((item) => {
      if (item.category?.name) names.add(item.category.name);
      else hasNone = true;
    });
    const list = Array.from(names)
      .map((name) => ({ value: name, label: categoryName(name) }))
      .sort((a, b) => a.label.localeCompare(b.label));
    if (hasNone) list.push({ value: UNCATEGORIZED, label: t('finance.uncategorized') });
    return list;
  }, [transactions, categoryName, t]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return transactions.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (accountFilter !== 'all' && item.account_id !== accountFilter) return false;
      if (categoryFilter !== 'all') {
        const key = item.category?.name || UNCATEGORIZED;
        if (key !== categoryFilter) return false;
      }
      if (needle) {
        const haystack = `${item.description} ${categoryName(item.category?.name)}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [transactions, typeFilter, accountFilter, categoryFilter, query, categoryName]);

  const totals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    filtered.forEach((item) => {
      if (item.type === 'income') income += toNumber(item.amount);
      if (item.type === 'expense') expenses += toNumber(item.amount);
    });
    return { income, expenses, net: income - expenses };
  }, [filtered]);

  const totalBalance = useMemo(
    () => accounts.reduce((sum, account) => sum + toNumber(account.current_balance), 0),
    [accounts]
  );

  // Spending by category, largest first. Colours follow the category (by rank); the tail folds into "Other".
  const spending = useMemo(() => {
    const byCategory = new Map<string, number>();
    filtered.forEach((item) => {
      if (item.type !== 'expense') return;
      const key = item.category?.name || UNCATEGORIZED;
      byCategory.set(key, (byCategory.get(key) || 0) + toNumber(item.amount));
    });
    const sorted = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);
    const head = sorted.slice(0, MAX_SLICES);
    const tail = sorted.slice(MAX_SLICES);
    const colorOf = new Map<string, string>();
    const slices = head.map(([key, value], index) => {
      colorOf.set(key, palette[index % palette.length]);
      return { key, name: key === UNCATEGORIZED ? t('finance.uncategorized') : categoryName(key), value, color: palette[index % palette.length] };
    });
    if (tail.length > 0) {
      slices.push({
        key: '__other__',
        name: t('finance.otherGroup'),
        value: tail.reduce((sum, [, value]) => sum + value, 0),
        color: OTHER_COLOR,
      });
    }
    return { slices, colorOf, total: slices.reduce((sum, slice) => sum + slice.value, 0) };
  }, [filtered, palette, categoryName, t]);

  const filtersActive =
    typeFilter !== 'all' || accountFilter !== 'all' || categoryFilter !== 'all' || query.trim() !== '';

  const clearFilters = () => {
    setTypeFilter('all');
    setAccountFilter('all');
    setCategoryFilter('all');
    setQuery('');
  };

  const dayLabel = (value: string) => format(parseISO(value), 'd MMM', { locale: dateLocale });

  const deleteTransaction = async (transaction: Transaction) => {
    if (!(await confirm({ title: t('finance.deleteTransactionConfirm'), confirmLabel: tc('delete') }))) return;
    try {
      const response = await fetch(`/api/finance?type=transaction&id=${transaction.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('delete failed');
      await loadFinanceData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error(t('finance.deleteFailed'));
    }
  };

  const archiveAccount = async (account: Account) => {
    if (!(await confirm({ title: t('finance.archiveAccountConfirm'), confirmLabel: t('finance.archive') }))) return;
    try {
      const response = await fetch(`/api/finance?type=account&id=${account.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('archive failed');
      if (accountFilter === account.id) setAccountFilter('all');
      await loadFinanceData();
    } catch (error) {
      console.error('Error archiving account:', error);
      toast.error(t('finance.deleteFailed'));
    }
  };

  const openImport = () => {
    if (accounts.length === 0) {
      setAccountDialog({ open: true });
      return;
    }
    setShowImport(true);
  };

  const periodOptions: { value: Period; label: string }[] = [
    { value: 'month', label: t('finance.periodMonth') },
    { value: 'lastMonth', label: t('finance.periodLastMonth') },
    { value: 'quarter', label: t('finance.periodQuarter') },
    { value: 'year', label: t('finance.periodYear') },
    { value: 'all', label: t('finance.periodAll') },
  ];

  const selectClass =
    'h-9 min-w-0 rounded-lg border border-border bg-secondary px-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30';

  if (!workspaceId) {
    return (
      <div className="space-y-5">
        <PageHeader title={t('finance.title')} description={t('finance.subtitle')} />
        <EmptyState title={t('webhooks.noWorkspace')} />
      </div>
    );
  }

  if (loading) {
    return <div className="py-16 text-center text-sm text-text-secondary">{t('finance.loading')}</div>;
  }

  const headerAction = (
    <div className="flex items-center gap-1">
      <Button onClick={() => setQuickAdd({ open: true, type: 'expense', projectId: null })} className="gap-2">
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{t('finance.addTransaction')}</span>
        <span className="sr-only sm:hidden">{t('finance.addTransaction')}</span>
      </Button>
      <IconMenu
        label={t('finance.moreActions')}
        items={[
          { label: t('finance.importCsv'), onClick: openImport },
          { label: t('finance.addAccount'), onClick: () => setAccountDialog({ open: true }) },
        ]}
      />
    </div>
  );

  if (loadError && accounts.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader title={t('finance.title')} description={t('finance.subtitle')} />
        <EmptyState
          title={t('finance.loadFailed')}
          action={<Button onClick={loadFinanceData}>{t('finance.retry')}</Button>}
        />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader title={t('finance.title')} description={t('finance.subtitle')} />
        <EmptyState
          title={t('finance.noAccounts')}
          body={t('finance.noAccountsBody')}
          action={<Button onClick={() => setAccountDialog({ open: true })}>{t('finance.createFirstAccount')}</Button>}
        />
        {accountDialog.open ? (
          <AccountManager
            onClose={() => setAccountDialog({ open: false })}
            onSave={() => {
              setAccountDialog({ open: false });
              loadFinanceData();
            }}
          />
        ) : null}
      </div>
    );
  }

  const kpis = [
    { label: t('finance.balance'), value: money(totalBalance), tone: totalBalance < 0 ? 'text-danger' : 'text-text-primary' },
    { label: t('finance.income'), value: money(totals.income), tone: 'text-text-primary' },
    { label: t('finance.expenses'), value: money(totals.expenses), tone: 'text-text-primary' },
    {
      label: t('finance.net'),
      value: `${totals.net > 0 ? '+' : ''}${money(totals.net)}`,
      tone: totals.net > 0 ? 'text-success' : totals.net < 0 ? 'text-danger' : 'text-text-primary',
    },
  ];

  const visible = filtered.slice(0, visibleCount);

  const categoryChip = (transaction: Transaction) => {
    const key = transaction.category?.name || UNCATEGORIZED;
    const dot =
      transaction.type === 'income' ? 'var(--brand-green)' : spending.colorOf.get(key) || OTHER_COLOR;
    return (
      <button
        type="button"
        onClick={() => setCategoryFilter(categoryFilter === key ? 'all' : key)}
        title={t('finance.filterByCategory')}
        className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-surface-hover px-2.5 py-0.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dot }} aria-hidden="true" />
        <span className="truncate">{categoryName(transaction.category?.name)}</span>
      </button>
    );
  };

  const amountCell = (transaction: Transaction) => {
    const currency = accountMap.get(transaction.account_id)?.currency;
    const isIncome = transaction.type === 'income';
    return (
      <span className={`font-semibold tabular-nums ${isIncome ? 'text-success' : 'text-text-primary'}`}>
        {isIncome ? '+' : transaction.type === 'expense' ? '-' : ''}
        {money(toNumber(transaction.amount), currency)}
      </span>
    );
  };

  const rowMenu = (transaction: Transaction) => (
    <IconMenu
      label={t('finance.moreActions')}
      items={[{ label: t('finance.deleteTransaction'), onClick: () => deleteTransaction(transaction), danger: true }]}
    />
  );

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader title={t('finance.title')} description={t('finance.subtitle')} action={headerAction} />

      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          className="hidden md:inline-flex"
          label={t('finance.period')}
          value={period}
          onChange={setPeriod}
          options={periodOptions}
        />
        <select
          aria-label={t('finance.period')}
          value={period}
          onChange={(event) => setPeriod(event.target.value as Period)}
          className={`${selectClass} w-full sm:w-auto md:hidden`}
        >
          {periodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {refreshing ? <span className="text-xs text-text-muted">{t('finance.loading')}</span> : null}
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-4">
        {kpis.map((item) => (
          <div key={item.label} className="min-w-0 bg-surface px-4 py-3">
            <dt className="truncate text-xs font-medium text-text-secondary">{item.label}</dt>
            <dd className={`mt-1 truncate text-xl font-semibold tabular-nums ${item.tone}`}>{item.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="finance-accounts">
        <h2 id="finance-accounts" className="sr-only">
          {t('finance.accounts')}
        </h2>
        <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] md:overflow-visible md:px-0">
          {accounts.map((account) => {
            const selected = accountFilter === account.id;
            return (
              <li
                key={account.id}
                className={`relative min-w-[13.5rem] shrink-0 snap-start rounded-xl border bg-surface transition-colors md:min-w-0 ${
                  selected ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-surface-hover'
                }`}
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  title={t('finance.filterByAccount')}
                  onClick={() => setAccountFilter(selected ? 'all' : account.id)}
                  className="block w-full min-w-0 rounded-xl px-4 py-3 pr-12 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="block truncate text-sm font-medium text-text-primary">{account.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-text-secondary">
                    {ACCOUNT_TYPE_KEYS[account.type] ? t(ACCOUNT_TYPE_KEYS[account.type]) : account.type.replace('_', ' ')}
                  </span>
                  <span
                    className={`mt-2 block truncate text-lg font-semibold tabular-nums ${
                      toNumber(account.current_balance) < 0 ? 'text-danger' : 'text-text-primary'
                    }`}
                  >
                    {money(toNumber(account.current_balance), account.currency)}
                  </span>
                </button>
                <div className="absolute right-1 top-1">
                  <IconMenu
                    label={t('finance.moreActions')}
                    items={[
                      { label: t('finance.edit'), onClick: () => setAccountDialog({ open: true, account }) },
                      { label: t('finance.archiveAccount'), onClick: () => archiveAccount(account), danger: true },
                    ]}
                  />
                </div>
              </li>
            );
          })}
          <li className="min-w-[13.5rem] shrink-0 snap-start md:min-w-0">
            <button
              type="button"
              onClick={() => setAccountDialog({ open: true })}
              className="flex h-full min-h-[5.5rem] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('finance.addAccount')}
            </button>
          </li>
        </ul>
      </section>

      <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_26rem]">
        <section
          className={`min-w-0 rounded-2xl border border-border bg-surface transition-opacity ${
            refreshing ? 'opacity-70' : ''
          }`}
        >
          <div className="space-y-3 border-b border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-text-primary">{t('finance.transactions')}</h2>
              <span className="text-xs text-text-secondary">
                {t('finance.transactionCount', { count: filtered.length })}
              </span>
            </div>
            <div className="flex flex-col gap-2 2xl:flex-row 2xl:items-center">
              <div className="relative min-w-0 2xl:flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('finance.searchPlaceholder')}
                  aria-label={t('finance.searchPlaceholder')}
                  className="h-9 w-full rounded-lg border border-border bg-secondary pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Segmented
                  label={t('finance.transactionType')}
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={[
                    { value: 'all', label: t('finance.filterAll') },
                    { value: 'income', label: t('finance.income') },
                    { value: 'expense', label: t('finance.expense') },
                  ]}
                />
                {categoryOptions.length > 0 ? (
                  <select
                    aria-label={t('finance.fieldCategory')}
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    className={`${selectClass} max-w-[11rem] flex-1 sm:flex-none`}
                  >
                    <option value="all">{t('finance.allCategories')}</option>
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : null}
                {accounts.length > 1 ? (
                  <select
                    aria-label={t('finance.account')}
                    value={accountFilter}
                    onChange={(event) => setAccountFilter(event.target.value)}
                    className={`${selectClass} max-w-[11rem] flex-1 sm:flex-none`}
                  >
                    <option value="all">{t('finance.allAccounts')}</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                {filtersActive ? (
                  <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('finance.clearFilters')}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-text-secondary">
              {transactions.length === 0 ? t('finance.noTransactions') : t('finance.noMatches')}
            </p>
          ) : (
            <>
              <table className="hidden w-full table-fixed text-sm lg:table xl:hidden 2xl:table">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-text-secondary">
                    <th scope="col" className="sticky top-14 z-10 w-24 bg-surface px-4 py-2.5 font-medium">
                      {t('finance.fieldDate')}
                    </th>
                    <th scope="col" className="sticky top-14 z-10 bg-surface px-2 py-2.5 font-medium">
                      {t('finance.fieldDescription')}
                    </th>
                    <th scope="col" className="sticky top-14 z-10 w-44 bg-surface px-2 py-2.5 font-medium">
                      {t('finance.fieldCategory')}
                    </th>
                    {accounts.length > 1 ? (
                      <th scope="col" className="sticky top-14 z-10 hidden w-36 bg-surface px-2 py-2.5 font-medium 2xl:table-cell">
                        {t('finance.account')}
                      </th>
                    ) : null}
                    <th scope="col" className="sticky top-14 z-10 w-32 bg-surface px-2 py-2.5 text-right font-medium">
                      {t('finance.fieldAmount')}
                    </th>
                    <th scope="col" className="sticky top-14 z-10 w-12 bg-surface py-2.5">
                      <span className="sr-only">{t('finance.moreActions')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((transaction) => (
                    <tr key={transaction.id} className="transition-colors hover:bg-surface-hover">
                      <td className="whitespace-nowrap px-4 py-2.5 text-text-secondary">{dayLabel(transaction.date)}</td>
                      <td className="min-w-0 px-2 py-2.5">
                        <span className="block max-w-[28rem] truncate font-medium text-text-primary" title={transaction.description}>
                          {transaction.description}
                        </span>
                        {accounts.length > 1 ? (
                          <span className="block truncate text-xs text-text-muted 2xl:hidden">
                            {accountMap.get(transaction.account_id)?.name}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2.5">{categoryChip(transaction)}</td>
                      {accounts.length > 1 ? (
                        <td className="hidden max-w-[9rem] truncate px-2 py-2.5 text-text-secondary 2xl:table-cell">
                          {accountMap.get(transaction.account_id)?.name}
                        </td>
                      ) : null}
                      <td className="whitespace-nowrap px-2 py-2.5 text-right">{amountCell(transaction)}</td>
                      <td className="py-1 pr-2">{rowMenu(transaction)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="divide-y divide-border lg:hidden xl:block 2xl:hidden">
                {visible.map((transaction) => (
                  <li key={transaction.id} className="flex items-start gap-2 py-3 pl-4 pr-2">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium text-text-primary">{transaction.description}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
                        <span>{dayLabel(transaction.date)}</span>
                        {categoryChip(transaction)}
                        {accounts.length > 1 ? <span className="truncate">{accountMap.get(transaction.account_id)?.name}</span> : null}
                      </div>
                    </div>
                    <div className="shrink-0 pt-0.5 text-sm">{amountCell(transaction)}</div>
                    {rowMenu(transaction)}
                  </li>
                ))}
              </ul>

              {filtered.length > visible.length ? (
                <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
                  <span className="text-xs text-text-secondary">
                    {t('finance.showing', { shown: visible.length, total: filtered.length })}
                  </span>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                    {t('finance.showMore')}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </section>

        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1">
          <section className="min-w-0 rounded-2xl border border-border bg-surface p-4 md:col-span-2 xl:col-span-1">
            <h2 className="text-base font-semibold text-text-primary">{t('finance.spendingByCategory')}</h2>
            {spending.slices.length > 0 ? (
              <div className="mt-3 grid grid-cols-1 items-center gap-4 sm:grid-cols-[11rem_minmax(0,1fr)] xl:grid-cols-1">
                <div className="relative mx-auto h-44 w-44 max-w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={spending.slices}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="62%"
                        outerRadius="100%"
                        paddingAngle={2}
                        stroke="none"
                        isAnimationActive={false}
                      >
                        {spending.slices.map((slice) => (
                          <Cell key={slice.key} fill={slice.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip formatValue={(value) => money(value)} />} />
                    </RePieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-text-secondary">{t('finance.expenses')}</span>
                    <span className="max-w-[6rem] truncate text-sm font-semibold tabular-nums text-text-primary">
                      {money(spending.total)}
                    </span>
                  </div>
                </div>
                <ul className="min-w-0 space-y-2">
                  {spending.slices.map((slice) => (
                    <li key={slice.key} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-text-primary">{slice.name}</span>
                      <span className="shrink-0 tabular-nums text-text-secondary">
                        {spending.total > 0 ? Math.round((slice.value / spending.total) * 100) : 0}%
                      </span>
                      <span className="w-24 shrink-0 truncate text-right font-medium tabular-nums text-text-primary">
                        {money(slice.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-text-secondary">{t('finance.noExpenseData')}</p>
            )}
          </section>

          <GoalsDashboard currency={baseCurrency} />
          <PendingBudgetRequests workspaceId={workspaceId} currency={baseCurrency} />
        </div>
      </div>

      {accountDialog.open ? (
        <AccountManager
          account={accountDialog.account as any}
          onClose={() => setAccountDialog({ open: false })}
          onSave={() => {
            setAccountDialog({ open: false });
            loadFinanceData();
          }}
        />
      ) : null}

      {quickAdd.open ? (
        <QuickAddTransaction
          accountId={accountFilter !== 'all' ? accountFilter : accounts[0]?.id}
          defaultType={quickAdd.type}
          projectId={quickAdd.projectId}
          onClose={() => setQuickAdd((state) => ({ ...state, open: false }))}
          onAdd={() => {
            setQuickAdd((state) => ({ ...state, open: false }));
            loadFinanceData();
          }}
        />
      ) : null}

      {showImport && accounts.length > 0 ? (
        <ImportTransactions
          accountId={accountFilter !== 'all' ? accountFilter : accounts[0].id}
          onImport={loadFinanceData}
          onClose={() => setShowImport(false)}
        />
      ) : null}
      {dialog}
    </div>
  );
}
