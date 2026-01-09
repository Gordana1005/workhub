'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Plus, Upload, Target } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import AccountManager from '@/components/finance/AccountManager';
import QuickAddTransaction from '@/components/finance/QuickAddTransaction';
import ImportTransactions from '@/components/finance/ImportTransactions';
import GoalsDashboard from '@/components/finance/GoalsDashboard';

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

export default function FinancePage() {
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

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadFinanceData();
    }
  }, [currentWorkspace?.id]);

  const loadFinanceData = async () => {
    if (!currentWorkspace?.id) return;
    
    setLoading(true);

    try {
      // Load accounts via API
      const accountsRes = await fetch(`/api/finance?workspace_id=${currentWorkspace.id}&type=accounts`);
      const accountsJson = await accountsRes.json();
      
      if (accountsJson.accounts) {
        setAccounts(accountsJson.accounts);
        const total = accountsJson.accounts.reduce((sum: number, acc: Account) => sum + parseFloat(acc.current_balance.toString()), 0);
        setStats(prev => ({ ...prev, totalBalance: total }));
      }

      // Load this month's transactions
      const startDate = startOfMonth(new Date()).toISOString().split('T')[0];
      const endDate = endOfMonth(new Date()).toISOString().split('T')[0];

      const transRes = await fetch(`/api/finance?workspace_id=${currentWorkspace.id}&type=transactions&start_date=${startDate}&end_date=${endDate}`);
      const transJson = await transRes.json();

      if (transJson.transactions) {
        setTransactions(transJson.transactions);
        
        const income = transJson.transactions
          .filter((t: Transaction) => t.type === 'income')
          .reduce((sum: number, t: Transaction) => sum + parseFloat(t.amount.toString()), 0);
        
        const expenses = transJson.transactions
          .filter((t: Transaction) => t.type === 'expense')
          .reduce((sum: number, t: Transaction) => sum + parseFloat(t.amount.toString()), 0);
        
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
  };

  // Chart data
  const categoryData = transactions
    .filter(t => t.type === 'expense' && t.category)
    .reduce((acc, t) => {
      const cat = t.category!.name;
      acc[cat] = (acc[cat] || 0) + parseFloat(t.amount.toString());
      return acc;
    }, {} as Record<string, number>);

  const pieData = Object.entries(categoryData).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#14b8a6'];

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-white">Loading finance data...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Finance</h1>
          <p className="text-slate-400">Track income, expenses, and financial goals</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {activeTab === 'overview' && (
            <>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
              >
                <Upload className="w-4 h-4" />
                Import CSV
              </button>
              <button
                onClick={() => setShowAccountModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Account
              </button>
              <button
                onClick={() => setShowTransactionModal(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Transaction
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-8 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'goals'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Target className="w-4 h-4" />
          Goals
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'overview' ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Balance"
          value={`$${stats.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<Wallet className="w-6 h-6" />}
          trend={stats.netIncome >= 0 ? 'up' : 'down'}
          color="blue"
        />
        <StatCard
          label="Monthly Income"
          value={`$${stats.monthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          label="Monthly Expenses"
          value={`$${stats.monthlyExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<TrendingDown className="w-6 h-6" />}
          color="red"
        />
        <StatCard
          label="Net Income"
          value={`$${stats.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarSign className="w-6 h-6" />}
          trend={stats.netIncome >= 0 ? 'up' : 'down'}
          color={stats.netIncome >= 0 ? 'green' : 'red'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Spending by Category */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Spending by Category</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.name}: $${entry.value.toFixed(0)}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
              </RePieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500">
              No expense data for this month
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Transactions</h3>
          <div className="space-y-3 max-h-[300px] overflow-auto">
            {transactions.length > 0 ? (
              transactions.slice(0, 10).map(transaction => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      transaction.type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                      {transaction.type === 'income' ? (
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <div className="text-white font-medium">{transaction.description}</div>
                      <div className="text-sm text-slate-400">
                        {transaction.category?.name || 'Uncategorized'} · {format(new Date(transaction.date), 'MMM d')}
                      </div>
                    </div>
                  </div>
                  <div className={`text-lg font-semibold ${
                    transaction.type === 'income' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}${parseFloat(transaction.amount.toString()).toFixed(2)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-500 py-8">
                No transactions yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Accounts */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Accounts</h3>
          <button 
            onClick={() => setShowAccountModal(true)}
            className="text-sm text-blue-500 hover:text-blue-400"
          >
            + Add Account
          </button>
        </div>
        {accounts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {accounts.map(account => (
              <div key={account.id} className="bg-slate-800 rounded-xl p-4 hover:bg-slate-700 transition-colors cursor-pointer">
                <div className="text-sm text-slate-400 mb-1">{account.name}</div>
                <div className="text-2xl font-bold text-white mb-1">
                  ${parseFloat(account.current_balance.toString()).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-500 capitalize">{account.type.replace('_', ' ')}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-500 mb-4">No accounts yet</p>
            <button 
              onClick={() => setShowAccountModal(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Create Your First Account
            </button>
          </div>
        )}
      </div>
        </>
      ) : (
        /* Goals Tab */
        <GoalsDashboard />
      )}

      {/* Modals */}
      {showAccountModal && (
        <AccountManager
          onClose={() => setShowAccountModal(false)}
          onSave={() => {
            setShowAccountModal(false);
            loadFinanceData();
          }}
        />
      )}

      {showTransactionModal && accounts.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6">
            <QuickAddTransaction
              accountId={accounts[0].id}
              onAdd={() => {
                setShowTransactionModal(false);
                loadFinanceData();
              }}
            />
            <button
              onClick={() => setShowTransactionModal(false)}
              className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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

function StatCard({ label, value, icon, trend, color }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    red: 'bg-red-500/10 text-red-500',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className={`inline-flex p-3 rounded-lg mb-3 ${colorClasses[color]}`}>
        {icon}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="flex items-center gap-2">
        <div className="text-sm text-slate-400">{label}</div>
        {trend && (
          <span className={`text-xs ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </div>
  );
}
