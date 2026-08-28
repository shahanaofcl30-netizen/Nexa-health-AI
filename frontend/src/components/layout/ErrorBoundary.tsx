import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070A12] flex items-center justify-center p-4">
          <div className="max-w-md w-full p-8 rounded-3xl glass-card border border-rose-500/40 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 border-2 border-rose-500 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Something went wrong while loading this page.</h2>
              <p className="text-sm text-slate-300">
                A rendering error occurred in the application.
              </p>
              {this.state.error && (
                <div className="p-3 bg-slate-900 rounded-lg text-left overflow-auto text-xs font-mono text-rose-300 mt-4 border border-rose-900/50">
                  {this.state.error.toString()}
                </div>
              )}
            </div>

            <button
              onClick={() => window.location.reload()}
              className="mt-6 flex items-center justify-center space-x-2 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Page</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
