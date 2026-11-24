import type { Filament } from '../types';

interface FilamentChipProps {
  filament?: Filament;
  missingLabel?: string;
  /** When true, applies green styling if spoolCount > 0 and red styling if spoolCount <= 0 or missing */
  statusColored?: boolean;
  size?: 'sm' | 'md';
}

export function FilamentChip({
  filament,
  missingLabel = 'Deleted filament',
  statusColored = false,
  size = 'sm',
}: FilamentChipProps) {
  const inStock = Boolean(filament && filament.spoolCount > 0);
  const swatchColor = filament?.colorHex ?? '#94a3b8';
  const label = filament ? filament.name : missingLabel;

  let colorClasses =
    'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';

  if (statusColored) {
    colorClasses = inStock
      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700/70 dark:bg-emerald-950/60 dark:text-emerald-300'
      : 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-700/70 dark:bg-rose-950/60 dark:text-rose-300';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1.5' : 'px-2.5 py-1 text-xs gap-2';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium leading-tight ${sizeClasses} ${colorClasses}`}
      title={
        filament
          ? `${filament.name} (${filament.material}) — ${filament.spoolCount} spools`
          : missingLabel
      }
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/15 dark:border-white/25"
        style={{ backgroundColor: swatchColor }}
      />
      <span className="truncate max-w-[140px]">{label}</span>
    </span>
  );
}
