import { useMemo, useState } from 'react';
import {
  Plus,
  Sparkles,
  Pencil,
  ArrowRightCircle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { setProductStatus } from '../lib/firestoreOps';
import { formatCurrency, formatGrams, resolveProductUnitCost } from '../lib/format';
import { FilamentChip } from './FilamentChip';
import type { Filament, Product } from '../types';

type WishlistFilter = 'all' | 'ready' | 'missing';

interface WishlistTabProps {
  wishlistProducts: Product[];
  filamentsById: Map<string, Filament>;
  avgSpoolCost: number;
  onAddWishlist: () => void;
  onEditProduct: (product: Product) => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function WishlistTab({
  wishlistProducts,
  filamentsById,
  avgSpoolCost,
  onAddWishlist,
  onEditProduct,
  onSuccess,
  onError,
}: WishlistTabProps) {
  const [filter, setFilter] = useState<WishlistFilter>('all');
  const [movingId, setMovingId] = useState<string | null>(null);

  const enrichedWishlist = useMemo(() => {
    return wishlistProducts.map((product) => {
      const missingCount = product.requiredFilamentIds.filter((fid) => {
        const f = filamentsById.get(fid);
        return !f || f.spoolCount <= 0;
      }).length;
      const isReady = missingCount === 0;
      return { product, isReady, missingCount };
    });
  }, [wishlistProducts, filamentsById]);

  const counts = useMemo(() => {
    let ready = 0;
    let missing = 0;
    for (const item of enrichedWishlist) {
      if (item.isReady) ready += 1;
      else missing += 1;
    }
    return { all: enrichedWishlist.length, ready, missing };
  }, [enrichedWishlist]);

  const filtered = useMemo(() => {
    if (filter === 'ready') return enrichedWishlist.filter((i) => i.isReady);
    if (filter === 'missing') return enrichedWishlist.filter((i) => !i.isReady);
    return enrichedWishlist;
  }, [enrichedWishlist, filter]);

  const handleMoveToActive = async (product: Product) => {
    setMovingId(product.id);
    try {
      await setProductStatus(product.id, 'active');
      onSuccess(`Moved "${product.name}" to Active Inventory`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to move product.');
    } finally {
      setMovingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Filter Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          {(
            [
              { id: 'all', label: `All (${counts.all})` },
              { id: 'ready', label: `Ready to Print (${counts.ready})` },
              { id: 'missing', label: `Missing Filaments (${counts.missing})` },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={`min-h-[40px] flex-1 rounded-lg px-3 text-xs font-semibold transition sm:flex-none ${
                filter === option.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onAddWishlist}
          className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Add Want-to-Print
        </button>
      </div>

      {/* Wishlist Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
          <Sparkles className="mb-3 h-10 w-10 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {wishlistProducts.length === 0
              ? 'Your Want-to-Print list is empty'
              : 'No wishlist prints match this filter'}
          </h3>
          <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
            {wishlistProducts.length === 0
              ? 'Save upcoming 3D models and their required filaments to see what you can print right now.'
              : 'Switch the filter above to see your other saved models.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map(({ product, isReady, missingCount }) => {
            const isMoving = movingId === product.id;
            const effectiveCost = resolveProductUnitCost(product, avgSpoolCost);

            return (
              <div
                key={product.id}
                className="flex flex-col justify-between gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {product.name}
                        </h3>
                        {isReady ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" />
                            Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800 dark:bg-rose-500/20 dark:text-rose-300">
                            <AlertCircle className="h-3 w-3" />
                            Missing {missingCount}
                          </span>
                        )}
                      </div>

                      {(effectiveCost > 0 || product.defaultPrice > 0 || product.filamentGrams !== undefined) && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {product.filamentGrams !== undefined && (
                            <>
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {formatGrams(product.filamentGrams)}
                              </span>
                              {' • '}
                            </>
                          )}
                          Est. Cost {formatCurrency(effectiveCost)} • Target Price{' '}
                          <strong className="text-slate-700 dark:text-slate-200">
                            {formatCurrency(product.defaultPrice)}
                          </strong>
                        </p>
                      )}

                      {product.notes && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {product.notes}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onEditProduct(product)}
                      aria-label={`Edit ${product.name}`}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Color-coded Filament Chips (Green = in stock, Red = out/missing) */}
                  <div>
                    {product.requiredFilamentIds.length === 0 ? (
                      <span className="text-xs italic text-slate-400 dark:text-slate-500">
                        No specific filaments required
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {product.requiredFilamentIds.map((fid) => (
                          <FilamentChip
                            key={fid}
                            filament={filamentsById.get(fid)}
                            statusColored
                            size="md"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* One-click Move to Active */}
                <button
                  type="button"
                  disabled={isMoving}
                  onClick={() => handleMoveToActive(product)}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 active:scale-[0.99] disabled:opacity-50 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300 dark:hover:bg-indigo-500/25"
                >
                  <ArrowRightCircle className="h-4 w-4" />
                  Move to Active
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
