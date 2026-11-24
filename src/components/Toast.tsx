import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import type { ToastMessage } from '../types';

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  if (!toast) return null;

  const styles = {
    success:
      'border-emerald-500/40 bg-emerald-600 text-white dark:bg-emerald-700',
    error: 'border-rose-500/40 bg-rose-600 text-white dark:bg-rose-700',
    info: 'border-slate-600/40 bg-slate-900 text-white dark:bg-slate-800',
  }[toast.tone];

  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
  }[toast.tone];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 sm:bottom-6">
      <div
        role="status"
        className={`pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${styles}`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1">{toast.text}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="rounded-lg p-1 opacity-80 transition hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
