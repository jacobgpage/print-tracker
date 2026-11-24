import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  X,
  Plus,
  Minus,
  Search,
  ShoppingBag,
  RotateCcw,
  Loader2,
  PackageOpen,
} from 'lucide-react';
import { logSale } from '../lib/firestoreOps';
import { formatCurrency, resolveProductUnitCost, roundCurrency } from '../lib/format';
import type { Product, SaleItem } from '../types';

interface LogSaleModalProps {
  open: boolean;
  activeProducts: Product[];
  avgSpoolCost: number;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function LogSaleModal({
  open,
  activeProducts,
  avgSpoolCost,
  onClose,
  onSuccess,
  onError,
}: LogSaleModalProps) {
  const [search, setSearch] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [finalPriceInput, setFinalPriceInput] = useState('0.00');
  const [isCustomPrice, setIsCustomPrice] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset form each time modal opens
  useEffect(() => {
    if (open) {
      setSearch('');
      setQuantities({});
      setFinalPriceInput('0.00');
      setIsCustomPrice(false);
      setNotes('');
      setSubmitting(false);
    }
  }, [open]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeProducts;
    return activeProducts.filter((p) => p.name.toLowerCase().includes(q));
  }, [activeProducts, search]);

  const selectedItems = useMemo<SaleItem[]>(() => {
    const list: SaleItem[] = [];
    for (const product of activeProducts) {
      const qty = quantities[product.id] ?? 0;
      if (qty > 0) {
        list.push({
          productId: product.id,
          productName: product.name,
          qty,
          unitCostSnapshot: resolveProductUnitCost(product, avgSpoolCost),
        });
      }
    }
    return list;
  }, [activeProducts, quantities, avgSpoolCost]);

  const { suggestedTotal, totalCost, totalUnits } = useMemo(() => {
    let suggested = 0;
    let cost = 0;
    let units = 0;
    for (const product of activeProducts) {
      const qty = quantities[product.id] ?? 0;
      if (qty > 0) {
        const effectiveCost = resolveProductUnitCost(product, avgSpoolCost);
        suggested += product.defaultPrice * qty;
        cost += effectiveCost * qty;
        units += qty;
      }
    }
    return {
      suggestedTotal: roundCurrency(suggested),
      totalCost: roundCurrency(cost),
      totalUnits: units,
    };
  }, [activeProducts, quantities, avgSpoolCost]);

  // Keep Final Sale Price synced with suggestedTotal unless manually overridden
  useEffect(() => {
    if (!isCustomPrice) {
      setFinalPriceInput(suggestedTotal.toFixed(2));
    }
  }, [suggestedTotal, isCustomPrice]);

  if (!open) return null;

  const parsedFinalPrice = Number.parseFloat(finalPriceInput);
  const effectiveRevenue =
    Number.isFinite(parsedFinalPrice) && parsedFinalPrice >= 0 ? parsedFinalPrice : 0;
  const estProfit = roundCurrency(effectiveRevenue - totalCost);

  const updateQty = (productId: string, delta: number) => {
    setQuantities((prev) => {
      const next = Math.max(0, (prev[productId] ?? 0) + delta);
      if (next === 0) {
        const { [productId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: next };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0 || submitting) return;
    if (!Number.isFinite(parsedFinalPrice) || parsedFinalPrice < 0) {
      onError('Please enter a valid final sale price.');
      return;
    }

    setSubmitting(true);
    try {
      await logSale({
        items: selectedItems,
        totalRevenue: parsedFinalPrice,
        notes,
      });
      onSuccess(
        `Sale logged: ${totalUnits} ${totalUnits === 1 ? 'unit' : 'units'} for ${formatCurrency(parsedFinalPrice)}`,
      );
      onClose();
    } catch (err) {
      console.error('Failed to log sale:', err);
      onError(err instanceof Error ? err.message : 'Failed to log sale.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-sale-title"
    >
      <div className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="log-sale-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                Log Sale
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select items &amp; confirm final price (bundle deals supported)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search active prints..."
              className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400"
            />
          </div>
        </div>

        {/* Product selector list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {activeProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <PackageOpen className="mb-2 h-9 w-9 text-slate-400" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                No active products yet
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Add a product in Inventory before logging sales.
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No active products match &ldquo;{search}&rdquo;.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((product) => {
                const qty = quantities[product.id] ?? 0;
                const isSelected = qty > 0;
                const exceedsStock = qty > product.stockQty;
                return (
                  <div
                    key={product.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-50/70 dark:border-emerald-600/60 dark:bg-emerald-950/30'
                        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {product.name}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {formatCurrency(product.defaultPrice)}
                        </span>
                        <span>•</span>
                        <span
                          className={
                            product.stockQty <= 0
                              ? 'font-medium text-rose-600 dark:text-rose-400'
                              : exceedsStock
                                ? 'font-medium text-amber-600 dark:text-amber-400'
                                : ''
                          }
                        >
                          Stock: {product.stockQty}
                          {exceedsStock ? ' (will go negative)' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateQty(product.id, -1)}
                        disabled={qty === 0}
                        aria-label={`Decrease quantity for ${product.name}`}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 active:scale-95 disabled:opacity-35 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-base font-bold tabular-nums text-slate-900 dark:text-white">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(product.id, 1)}
                        aria-label={`Increase quantity for ${product.name}`}
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs transition hover:bg-indigo-700 active:scale-95"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Form: Pricing + Notes + Submit */}
        <form
          onSubmit={handleSubmit}
          className="space-y-3 border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/60"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label
                  htmlFor="final-sale-price"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
                >
                  Final Sale Price ($)
                </label>
                {isCustomPrice && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomPrice(false);
                      setFinalPriceInput(suggestedTotal.toFixed(2));
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset ({formatCurrency(suggestedTotal)})
                  </button>
                )}
              </div>
              <input
                id="final-sale-price"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                value={finalPriceInput}
                onChange={(e) => {
                  setIsCustomPrice(true);
                  setFinalPriceInput(e.target.value);
                }}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-lg font-bold tabular-nums text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="sale-notes"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
              >
                Notes (optional)
              </label>
              <input
                id="sale-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 3-for-$25 bundle, cash"
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600 dark:text-slate-400">
              <span>
                Items: <strong className="text-slate-900 dark:text-white">{totalUnits}</strong>
              </span>
              <span>
                Suggested:{' '}
                <strong className="text-slate-900 dark:text-white">
                  {formatCurrency(suggestedTotal)}
                </strong>
              </span>
              <span>
                COGS:{' '}
                <strong className="text-slate-900 dark:text-white">
                  {formatCurrency(totalCost)}
                </strong>
              </span>
            </div>
            <span
              className={`font-bold ${
                estProfit >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              Profit: {formatCurrency(estProfit)}
            </span>
          </div>

          <button
            type="submit"
            disabled={selectedItems.length === 0 || submitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Recording sale...
              </>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" />
                Complete Sale {totalUnits > 0 ? `(${formatCurrency(effectiveRevenue)})` : ''}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
