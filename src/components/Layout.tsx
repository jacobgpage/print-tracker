import type { ReactNode } from 'react';
import {
  Box,
  LayoutDashboard,
  Package,
  Sparkles,
  Disc3,
  LogOut,
  Moon,
  Sun,
  ShoppingBag,
} from 'lucide-react';
import type { TabId } from '../types';

interface LayoutProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  onOpenLogSale: () => void;
  onSignOut: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  restockCount: number;
  shoppingCount: number;
  userEmail: string | null;
  children: ReactNode;
}

const TABS: Array<{ id: TabId; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'wishlist', label: 'Wishlist', icon: Sparkles },
  { id: 'filaments', label: 'Filaments', icon: Disc3 },
];

export function Layout({
  activeTab,
  onSelectTab,
  onOpenLogSale,
  onSignOut,
  theme,
  onToggleTheme,
  restockCount,
  shoppingCount,
  userEmail,
  children,
}: LayoutProps) {
  const getBadge = (id: TabId): number => {
    if (id === 'dashboard') return restockCount;
    if (id === 'filaments') return shoppingCount;
    return 0;
  };

  return (
    <div className="min-h-dvh bg-slate-50 pb-24 text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:pb-10">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Box className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <span className="block text-base font-bold tracking-tight text-slate-900 dark:text-white">
                PrintTracker
              </span>
              {userEmail && (
                <span className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
                  {userEmail}
                </span>
              )}
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              const badge = getBadge(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectTab(id)}
                  className={`relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                  {badge > 0 && (
                    <span
                      className={`ml-0.5 inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none ${
                        id === 'filaments'
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenLogSale}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Log Sale</span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label="Toggle color theme"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={onSignOut}
              aria-label="Sign out"
              title="Sign out"
              className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-5 sm:py-6">{children}</main>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Mobile navigation"
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 md:hidden"
      >
        <div className="grid grid-cols-4 gap-1 px-2 pt-1.5">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            const badge = getBadge(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectTab(id)}
                className={`relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold transition ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {badge > 0 && (
                    <span
                      className={`absolute -right-2.5 -top-1.5 inline-flex min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-4 text-white ${
                        id === 'filaments' ? 'bg-rose-600' : 'bg-amber-500'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </div>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
