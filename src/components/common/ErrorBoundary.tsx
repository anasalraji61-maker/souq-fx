import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { LangId, DICTS } from '../../i18n/locales';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  currentLang?: LangId;
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
      let lang = this.props.currentLang;
      if (!lang && typeof window !== 'undefined') {
        lang = (localStorage.getItem('matrix_lang') as LangId) || 'ar';
      }
      const dict = DICTS[lang || 'ar'] || DICTS.ar;
      const isRtl = lang === 'ar' || lang === 'ku';

      return (
        <div
          dir={isRtl ? 'rtl' : 'ltr'}
          className="h-full w-full min-h-[360px] flex items-center justify-center bg-[#070D18] text-[#E8EEF9] p-6 select-none"
        >
          <div className="max-w-md w-full bg-[#0E1626] border border-[#243049] rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8 text-rose-400" />
            </div>

            <div>
              <h2 className="text-base font-bold text-white mb-1.5">
                {dict.errorTitle}
              </h2>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                {this.props.fallbackMessage || dict.errorSubtitle}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2.5 rounded-xl bg-[#16233B] hover:bg-[#1E2E4A] text-[#2DD4BF] text-xs font-bold transition-colors cursor-pointer border border-[#2DD4BF]/30 min-h-[44px]"
              >
                {dict.retryButton}
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2.5 rounded-xl bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#042F2E] text-xs font-black transition-colors cursor-pointer shadow-md min-h-[44px] flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{lang === 'en-US' ? 'Reload Page' : lang === 'ku' ? 'نوێکردنەوەی پەڕە' : 'إعادة تحميل الصفحة'}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
