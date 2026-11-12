import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface WorkspaceErrorCardProps {
  title?: string;
  error: string;
  endpoint?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const WorkspaceErrorCard: React.FC<WorkspaceErrorCardProps> = ({
  title = 'Local Gateway Connection Error',
  error,
  endpoint,
  onRetry,
  retryLabel = 'Retry Connection',
}) => {
  return (
    <div
      role="alert"
      className="my-6 rounded-2xl border border-red-500/25 bg-red-50/70 dark:bg-red-950/20 p-6 max-w-2xl mx-auto shadow-sm"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h3>
          <p className="mt-1 text-[13px] text-zinc-700 dark:text-zinc-300 leading-relaxed break-words">
            {error}
          </p>
          {endpoint && (
            <p className="mt-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              Boundary: {endpoint}
            </p>
          )}
          {onRetry && (
            <div className="mt-4 flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={onRetry}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                {retryLabel}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
  scopeName?: string;
  resetKey?: string | number;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(`[ErrorBoundary${this.props.scopeName ? `:${this.props.scopeName}` : ''}]`, error, info.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      const message = this.state.error?.message || 'An unexpected rendering failure occurred.';
      return (
        <div className="p-6 max-w-2xl mx-auto">
          <div
            role="alert"
            className="rounded-2xl border border-red-500/30 bg-white dark:bg-[#1C1C1E] p-6 shadow-md"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-mono uppercase tracking-wider text-red-600 dark:text-red-400">
                  Route Error Boundary · {this.props.scopeName || 'Workspace'}
                </div>
                <h2 className="mt-1 text-[16px] font-semibold text-zinc-900 dark:text-zinc-100">
                  Component Encountered a Fault
                </h2>
                <p className="mt-1.5 text-[13px] text-zinc-600 dark:text-zinc-400 break-words">
                  {message}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <Button variant="primary" size="sm" onClick={this.handleReset}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Recover Workspace
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
