'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

interface BudgetRequestFormProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const fieldClass = 'block w-full min-w-0 rounded-lg border border-border bg-secondary px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30';

export default function BudgetRequestForm({ projectId, onClose, onSuccess }: BudgetRequestFormProps) {
  const t = useTranslations('pages.tools');
  const toast = useToast();
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: '',
    justification: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('project_budget_requests')
        .insert({
          project_id: projectId,
          requester_id: user.id,
          amount: parseFloat(formData.amount),
          description: formData.description,
          category: formData.category || null,
          justification: formData.justification || null,
          status: 'pending',
        });

      if (error) {
        console.error('Budget request error:', error);
        throw error;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create budget request:', error);
      toast.error(t('finance.createRequestFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open
      title={t('finance.requestBudget')}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('finance.cancel')}
          </Button>
          <Button
            type="submit"
            form="budget-request-form"
            disabled={isSubmitting || !formData.amount || !formData.description}
          >
            {isSubmitting ? t('finance.submitting') : t('finance.submitRequest')}
          </Button>
        </div>
      }
    >
      <form id="budget-request-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary" htmlFor="budget-amount">
            {t('finance.amount')} <span className="text-danger">*</span>
          </label>
          <input
            id="budget-amount"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="250.00"
            className={fieldClass}
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary" htmlFor="budget-description">
            {t('finance.description')} <span className="text-danger">*</span>
          </label>
          <input
            id="budget-description"
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder={t('finance.descriptionPlaceholder')}
            className={fieldClass}
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary" htmlFor="budget-category">
            {t('finance.categoryOptional')}
          </label>
          <select
            id="budget-category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className={fieldClass}
          >
            <option value="">{t('finance.selectCategory')}</option>
            <option value="Software Subscription">{t('finance.budgetCatSoftware')}</option>
            <option value="Hardware">{t('finance.budgetCatHardware')}</option>
            <option value="Services">{t('finance.budgetCatServices')}</option>
            <option value="Marketing">{t('finance.budgetCatMarketing')}</option>
            <option value="Infrastructure">{t('finance.budgetCatInfrastructure')}</option>
            <option value="Office Supplies">{t('finance.budgetCatOffice')}</option>
            <option value="Travel">{t('finance.budgetCatTravel')}</option>
            <option value="Training">{t('finance.budgetCatTraining')}</option>
            <option value="Consulting">{t('finance.budgetCatConsulting')}</option>
            <option value="Other">{t('finance.budgetCatOther')}</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary" htmlFor="budget-justification">
            {t('finance.justificationOptional')}
          </label>
          <textarea
            id="budget-justification"
            value={formData.justification}
            onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
            placeholder={t('finance.justificationPlaceholder')}
            rows={4}
            className={`${fieldClass} resize-none`}
          />
        </div>
      </form>
    </Dialog>
  );
}
