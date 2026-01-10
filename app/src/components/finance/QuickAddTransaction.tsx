'use client';

import { useState, useEffect, useCallback } from 'react';
import { parseNaturalLanguageTransaction } from '@/lib/finance-parser';
import { Sparkles, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';

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
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<ParsedTransaction | null>(null);
  const [manualType, setManualType] = useState<'income' | 'expense'>('expense');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState(accountId || '');
  const [categories, setCategories] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentWorkspace } = useWorkspaceStore();

  const loadAccounts = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    
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

  // Update preview when manual type changes
  useEffect(() => {
    if (preview) {
      setPreview({ ...preview, type: manualType });
    }
  }, [manualType, preview]);

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
      alert('Failed to add transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400 mb-4">You need to create an account first</p>
        <p className="text-sm text-slate-500">Close this dialog and create an account to start tracking transactions</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-white">Quick Add with AI</h3>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-slate-400 mb-2">Account</label>
        <select
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          {accounts.map(account => (
            <option key={account.id} value={account.id}>
              {account.name} (${parseFloat(account.current_balance).toFixed(2)})
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-slate-400 mb-2">Transaction Type</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setManualType('expense')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              manualType === 'expense'
                ? 'bg-red-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setManualType('income')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              manualType === 'income'
                ? 'bg-green-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Income
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-slate-400 mb-2">Describe your transaction</label>
        <input
          type="text"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="e.g., 'Spent $50 on groceries yesterday'"
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
        />
        <p className="text-xs text-slate-500 mt-2">
          Try: "Spent $50 on groceries", "Earned $500 from freelance", "Coffee $5"
        </p>
      </div>

      {preview && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-300">Preview</span>
            <button
              onClick={() => {
                setInput('');
                setPreview(null);
              }}
              className="text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Amount:</span>
              <span className="ml-2 text-white font-medium">${preview.amount.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-400">Type:</span>
              <span className={`ml-2 font-medium ${preview.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                {preview.type === 'income' ? 'Income' : 'Expense'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Category:</span>
              <span className="ml-2 text-white">{preview.category || 'Uncategorized'}</span>
            </div>
            <div>
              <span className="text-slate-400">Date:</span>
              <span className="ml-2 text-white">{preview.date.toLocaleDateString()}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400">Description:</span>
              <span className="ml-2 text-white">{preview.description}</span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!preview || isSubmitting || !selectedAccountId}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
      >
        {isSubmitting ? 'Adding...' : 'Add Transaction'}
      </button>
    </div>
  );
}
