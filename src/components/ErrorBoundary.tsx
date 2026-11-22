import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Zap, CheckCircle2 } from 'lucide-react';
import { runStorageSelfHealing } from '../utils/systemSelfHeal';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  healMessage: string | null;
  confirmReset: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private healTimer: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      healMessage: null,
      confirmReset: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled runtime error caught by ErrorBoundary:', error, errorInfo);
  }

  componentWillUnmount() {
    if (this.healTimer !== null) {
      window.clearTimeout(this.healTimer);
      this.healTimer = null;
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleSafeSelfHeal = () => {
    try {
      const res = runStorageSelfHealing();
      this.setState({
        healMessage:
          res.repairedCount > 0
            ? `已安全修復 ${res.repairedCount} 項異常資料並保留全部學習紀錄，正在重新恢復系統...`
            : '本機儲存資料結構完好無損，可安全恢復執行！',
      });
      if (this.healTimer !== null) {
        window.clearTimeout(this.healTimer);
      }
      this.healTimer = window.setTimeout(() => {
        this.healTimer = null;
        this.setState({ hasError: false, error: null, healMessage: null, confirmReset: false });
      }, 900);
    } catch {
      window.location.reload();
    }
  };

  handleResetStorage = () => {
    if (!this.state.confirmReset) {
      this.setState({ confirmReset: true });
      return;
    }
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
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black text-slate-100">系統穩定防護機制已啟動</h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                偵測到前端執行階段異常。系統已攔截錯誤並保護您的學習紀錄與書籤資料，建議先執行無損自我修復。
              </p>
            </div>

            {this.state.healMessage && (
              <div className="bg-emerald-950/80 border border-emerald-500/60 rounded-xl p-3 text-xs text-emerald-200 font-bold flex items-center gap-2 text-left">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{this.state.healMessage}</span>
              </div>
            )}

            {this.state.error && (
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-left overflow-x-auto max-h-32 text-[11px] font-mono text-red-300/90">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={this.handleSafeSelfHeal}
                className="w-full px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                <Zap className="w-4 h-4" />
                <span>一鍵無損自癒並恢復（保留紀錄）</span>
              </button>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="w-full sm:w-auto flex-1 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>重新整理頁面</span>
                </button>
                <button
                  type="button"
                  onClick={this.handleResetStorage}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                    this.state.confirmReset
                      ? 'bg-red-600 hover:bg-red-500 text-white border-red-400'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{this.state.confirmReset ? '確認清除本機暫存' : '重設暫存資料'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
