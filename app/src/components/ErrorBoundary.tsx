'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

function ErrorFallback({ message, onRetry }: { message?: string; onRetry: () => void }) {
  const t = useTranslations('pages.tools');
  const tc = useTranslations('common');

  return (
    <div role="alert" className="flex min-h-[60dvh] items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center text-text-primary shadow-md sm:p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <AlertTriangle className="h-7 w-7" aria-hidden />
        </div>
        <h2 className="mb-1.5 text-xl font-semibold tracking-tight text-text-primary">{t('error.title')}</h2>
        <p className="text-sm leading-6 text-text-secondary">{t('error.fallback')}</p>
        {message ? (
          <p className="mt-4 max-h-28 overflow-auto rounded-lg border border-border bg-tertiary px-3 py-2 text-left font-mono text-xs leading-5 text-text-muted">
            {message}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <Button type="button" variant="secondary" onClick={onRetry}>
            {tc('retry')}
          </Button>
          <Button type="button" leftIcon={<RefreshCw />} onClick={() => window.location.reload()}>
            {t('error.reload')}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development, will integrate with Sentry in production
    console.error('ErrorBoundary caught:', error, errorInfo);

    // If Sentry is available, send error
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: { react: { componentStack: errorInfo.componentStack } },
      });
    }
  }

  private reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback message={this.state.error?.message} onRetry={this.reset} />;
    }

    return this.props.children;
  }
}
