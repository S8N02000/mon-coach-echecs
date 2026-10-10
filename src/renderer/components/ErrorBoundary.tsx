import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
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
    console.error('[ErrorBoundary] Uncaught React error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 select-none">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
              <AlertOctagon className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">
                Un incident d'affichage est survenu
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                L'application a intercepté une erreur d'interface. Vos moteurs et parties restent sauvegardés.
              </p>
            </div>
            {this.state.error && (
              <div className="w-full bg-zinc-950 rounded-xl p-3 text-left font-mono text-[11px] text-red-300/80 overflow-x-auto max-h-32 border border-zinc-800">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              Recharger l'interface
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
