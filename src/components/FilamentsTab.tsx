import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Plus,
  ShoppingCart,
  ExternalLink,
  Pencil,
  Search,
  Disc3,
  CheckCircle2,
  Scale,
  Check,
  Loader2,
} from 'lucide-react';
import { adjustFilamentSpools, saveAvgSpoolCost } from '../lib/firestoreOps';
import { formatCurrency, formatSpools, sanitizeExternalUrl } from '../lib/format';
import type { Filament, ShoppingListEntry } from '../types';

interface FilamentsTabProps {
  filaments: Filament[];
  shoppingList: ShoppingListEntry[];
  avgSpoolCost: number;
  onAddFilament: () => void;
  onEditFilament: (filament: Filament) => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function FilamentsTab({
  filaments,
  shoppingList,
  avgSpoolCost,
  onAddFilament,
  onEditFilament,
  onSuccess,
  onError,
}: FilamentsTabProps) {
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [spoolCostInput, setSpoolCostInput] = useState(avgSpoolCost.toFixed(2));
  const [savingSpoolCost, setSavingSpoolCost] = useState(false);

  useEffect(() => {
    setSpoolCostInput(avgSpoolCost.toFixed(2));
  }, [avgSpoolCost]);

  const parsedSpoolCost = Number.parseFloat(spoolCostInput);
  const spoolCostDirty =
    Number.isFinite(parsedSpoolCost) &&
    Math.abs(parsedSpoolCost - avgSpoolCost) > 0.001;
  const costPerGram =
    Number.isFinite(parsedSpoolCost) && parsedSpoolCost >= 0
      ? parsedSpoolCost / 1000
      : 0;

  const handleSaveSpoolCost = async (e: FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(parsedSpoolCost) || parsedSpoolCost < 0 || savingSpoolCost) {
      onError('Enter a valid average spool cost.');
      return;
    }

    setSavingSpoolCost(true);
    try {
      await saveAvgSpoolCost(parsedSpoolCost);
      onSuccess(`Avg 1kg spool cost set to ${formatCurrency(parsedSpoolCost)}`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save spool cost.');
    } finally {
      setSavingSpoolCost(false);
    }
  };

  const filteredFilaments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filaments;
    return filaments.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.material.toLowerCase().includes(q) ||
        (f.brand?.toLowerCase().includes(q) ?? false),
    );
  }, [filaments, search]);

  const handleAdjustSpools = async (filament: Filament, delta: number) => {
    setBusyId(filament.id);
    try {
      await adjustFilamentSpools(filament.id, filament.spoolCount, delta);
      const next = Math.max(0, Math.round((filament.spoolCount + delta) * 10) / 10);
      onSuccess(`${filament.name}: ${formatSpools(next)} spools`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update spool count.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Average 1kg Spool Cost Card */}
      <form
        onSubmit={handleSaveSpoolCost}
        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <label
              htmlFor="avg-spool-cost"
              className="block text-sm font-bold text-slate-900 dark:text-white"
            >
              Average Spool Cost (1kg / 1,000g)
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Used to auto-calculate item cost from filament grams (
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                ${costPerGram.toFixed(3)}/g
              </span>
              )
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-32 sm:flex-none">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
              $
            </span>
            <input
              id="avg-spool-cost"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={spoolCostInput}
              onChange={(e) => setSpoolCostInput(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 pl-7 pr-3 text-sm font-bold tabular-nums text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900"
            />
          </div>
          <button
            type="submit"
            disabled={!spoolCostDirty || savingSpoolCost}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700 active:scale-95 disabled:opacity-45"
          >
            {savingSpoolCost ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Save
          </button>
        </div>
      </form>

      {/* Dedicated Shopping List Banner */}
      <section
        aria-label="Filament shopping list"
        className={`rounded-2xl border p-4 sm:p-5 ${
          shoppingList.length > 0
            ? 'border-amber-300 bg-amber-50/80 dark:border-amber-600/50 dark:bg-amber-950/30'
            : 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-800/50 dark:bg-emerald-950/20'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                shoppingList.length > 0
                  ? 'bg-amber-500 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {shoppingList.length > 0 ? (
                <ShoppingCart className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Shopping List ({shoppingList.length})
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {shoppingList.length > 0
                  ? 'Out-of-stock filaments needed by your Restock Queue or Wishlist'
                  : 'All filaments required by your Restock Queue and Wishlist are in stock!'}
              </p>
            </div>
          </div>
        </div>

        {shoppingList.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {shoppingList.map(({ filament, neededBy }) => {
              const safeUrl = sanitizeExternalUrl(filament.reorderUrl);
              return (
                <div
                  key={filament.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-amber-200/90 bg-white p-3 shadow-2xs dark:border-amber-800/60 dark:bg-slate-900"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="h-9 w-9 shrink-0 rounded-full border-2 border-black/10 shadow-inner dark:border-white/20"
                      style={{ backgroundColor: filament.colorHex }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                        {filament.name}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {filament.material}
                        {filament.brand ? ` • ${filament.brand}` : ''}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] font-medium text-amber-700 dark:text-amber-300">
                        Needed by: {neededBy.map((n) => n.name).join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {safeUrl && (
                      <a
                        href={safeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 items-center gap-1 rounded-xl bg-amber-500 px-3 text-xs font-bold text-white transition hover:bg-amber-600"
                      >
                        Buy
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={busyId === filament.id}
                      onClick={() => handleAdjustSpools(filament, 1)}
                      className="h-10 rounded-xl border border-slate-300 bg-slate-50 px-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      title="Mark 1 spool received"
                    >
                      +1
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Search + Add Filament Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filaments by color, brand, or material..."
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 shadow-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <button
          type="button"
          onClick={onAddFilament}
          className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Add Filament
        </button>
      </div>

      {/* Full Filament List */}
      {filteredFilaments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
          <Disc3 className="mb-3 h-10 w-10 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {search ? 'No matching filaments' : 'No filaments tracked yet'}
          </h3>
          <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
            {search
              ? 'Try searching another color, material, or brand.'
              : 'Add your filament spools so you can link them to prints and auto-generate a shopping list.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filteredFilaments.map((filament) => {
            const isOut = filament.spoolCount <= 0;
            const isBusy = busyId === filament.id;
            const safeUrl = sanitizeExternalUrl(filament.reorderUrl);

            return (
              <div
                key={filament.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="h-11 w-11 shrink-0 rounded-2xl border-2 border-black/10 shadow-inner dark:border-white/20"
                      style={{ backgroundColor: filament.colorHex }}
                    />
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-slate-900 dark:text-white">
                        {filament.name}
                      </h3>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {filament.material}
                        {filament.brand ? ` • ${filament.brand}` : ''}
                      </p>
                      {safeUrl && (
                        <a
                          href={safeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          Reorder link
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onEditFilament(filament)}
                    aria-label={`Edit ${filament.name}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>

                {/* Spool Counter + Quick Buttons */}
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Spools
                    </span>
                    <span
                      className={`text-lg font-bold tabular-nums ${
                        isOut
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {formatSpools(filament.spoolCount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isBusy || isOut}
                      onClick={() => handleAdjustSpools(filament, -0.5)}
                      className="h-11 min-w-[54px] rounded-xl border border-slate-300 bg-white px-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      -0.5
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleAdjustSpools(filament, 0.5)}
                      className="h-11 min-w-[54px] rounded-xl border border-slate-300 bg-white px-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      +0.5
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleAdjustSpools(filament, 1)}
                      className="h-11 min-w-[52px] rounded-xl bg-indigo-600 px-3 text-sm font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-95 disabled:opacity-40"
                    >
                      +1
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
