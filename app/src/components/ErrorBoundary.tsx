'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

function ErrorFallback({ message }: { message?: string }) {
  const t = useTranslations('pages.tools');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 text-center text-text-primary">
        <AlertTriangle className="w-16 h-16 text-danger mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-text-primary mb-2">{t('error.title')}</h2>
        <p className="text-text-secondary mb-6">
          {message || t('error.fallback')}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 mx-auto px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          {t('error.reload')}
        </button>
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

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback message={this.state.error?.message} />;
    }

    return this.props.children;
  }
}
