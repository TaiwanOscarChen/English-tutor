import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled runtime error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetStorage = () => {
    try {
      localStorage.removeItem('fse_bookmarks');
      localStorage.removeItem('fse_visited_lessons');
      localStorage.removeItem('fse_user_diagnostics');
      localStorage.removeItem('fse_shift_settings');
    } catch (e) {
      console.warn('Failed clearing localStorage:', e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 bg-red-950/80 border border-red-800/80 rounded-2xl flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black text-slate-100">系統穩定防護機制已啟動</h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                偵測到前端執行階段異常。不用擔心，您的整體進度與設定已受到系統防護隔離。
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-left overflow-x-auto max-h-32 text-[11px] font-mono text-red-300/90">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto flex-1 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>重新整理頁面</span>
              </button>
              <button
                onClick={this.handleResetStorage}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700"
              >
                <Trash2 className="w-4 h-4 text-slate-400" />
                <span>重設暫存資料</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
