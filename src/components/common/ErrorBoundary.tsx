import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
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
    console.error('MATRIX Uncaught Error in screen:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="h-full w-full min-h-[360px] flex items-center justify-center bg-[#070D18] text-[#E8EEF9] p-6 select-none"
        >
          <div className="max-w-md w-full bg-[#0E1626] border border-[#243049] rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8 text-rose-400" />
            </div>

            <div>
              <h2 className="text-base font-bold text-white mb-1.5">
                حدث خطأ أثناء تحميل هذه الشاشة
              </h2>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                {this.props.fallbackMessage ||
                  'واجه التطبيق استثناءً غير متوقع في معالجة هذه الواجهة. تم عزل الخطأ لمنع توقف المنصة.'}
              </p>
            </div>

            {this.state.error && (
              <div className="p-2.5 rounded-lg bg-[#070C16] border border-[#1A253A] font-mono text-[10px] text-rose-300 text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-[#141E30] hover:bg-[#1E2B44] text-[#A3B4D0] hover:text-white text-xs font-semibold transition-colors"
              >
                محاولة استعادة العرض
              </button>
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة تحميل الشاشة</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
