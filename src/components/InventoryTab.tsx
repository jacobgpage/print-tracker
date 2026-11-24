import { useMemo, useState } from 'react';
import {
  Search,
  Plus,
  ShoppingBag,
  Pencil,
  Archive,
  RotateCcw,
  Package,
} from 'lucide-react';
import { adjustProductStock, setProductStatus } from '../lib/firestoreOps';
import { formatCurrency, formatGrams, resolveProductUnitCost } from '../lib/format';
import { FilamentChip } from './FilamentChip';
import type { Filament, Product } from '../types';

interface InventoryTabProps {
  activeProducts: Product[];
  archivedProducts: Product[];
  filamentsById: Map<string, Filament>;
  avgSpoolCost: number;
  onOpenLogSale: () => void;
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function InventoryTab({
  activeProducts,
  archivedProducts,
  filamentsById,
  avgSpoolCost,
  onOpenLogSale,
  onAddProduct,
  onEditProduct,
  onSuccess,
  onError,
}: InventoryTabProps) {
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const visibleProducts = useMemo(() => {
    const source = showArchived ? archivedProducts : activeProducts;
    const q = search.trim().toLowerCase();
    if (!q) return source;
    return source.filter((p) => {
      if (p.name.toLowerCase().includes(q)) return true;
      if (p.notes?.toLowerCase().includes(q)) return true;
      return p.requiredFilamentIds.some((fid) =>
        filamentsById.get(fid)?.name.toLowerCase().includes(q),
      );
    });
  }, [activeProducts, archivedProducts, showArchived, search, filamentsById]);

  const handleQuickStock = async (product: Product, delta: number) => {
    setBusyId(product.id);
    try {
      await adjustProductStock(product.id, delta);
      onSuccess(`Added +${delta} stock to "${product.name}"`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update stock.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRestore = async (product: Product) => {
    setBusyId(product.id);
    try {
      await setProductStatus(product.id, 'active');
      onSuccess(`Restored "${product.name}" to active`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to restore product.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prints, notes, or filament colors..."
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 shadow-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenLogSale}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98] sm:flex-none"
          >
            <ShoppingBag className="h-4 w-4" />
            Log Sale
          </button>

          <button
            type="button"
            onClick={onAddProduct}
            className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98] sm:flex-none"
          >
            <Plus className="h-4 w-4" />
            Add Print
          </button>
        </div>
      </div>

      {/* Active / Archived Switcher */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Showing {visibleProducts.length} {showArchived ? 'archived' : 'active'}{' '}
          {visibleProducts.length === 1 ? 'product' : 'products'}
        </p>

        {archivedProducts.length > 0 && (
          <button
            type="button"
            onClick={() => setShowArchived((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
              showArchived
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <Archive className="h-3.5 w-3.5" />
            {showArchived ? 'View Active' : `Archived (${archivedProducts.length})`}
          </button>
        )}
      </div>

      {/* Product Grid */}
      {visibleProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
          <Package className="mb-3 h-10 w-10 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {search
              ? 'No matching products'
              : showArchived
                ? 'No archived products'
                : 'No active products yet'}
          </h3>
          <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
            {search
              ? 'Try a different search keyword.'
              : 'Add your 3D prints with unit cost, sale price, and required filaments to start tracking inventory.'}
          </p>
          {!search && !showArchived && (
            <button
              type="button"
              onClick={onAddProduct}
              className="mt-4 inline-flex h-11 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Add First Print
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {visibleProducts.map((product) => {
            const isLow = product.stockQty <= product.lowStockThreshold;
            const isBusy = busyId === product.id;
            const effectiveCost = resolveProductUnitCost(product, avgSpoolCost);

            return (
              <div
                key={product.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div className="space-y-3">
                  {/* Top row: Name + Edit */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-slate-900 dark:text-white">
                        {product.name}
                      </h3>
                      {product.notes && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                          {product.notes}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onEditProduct(product)}
                      aria-label={`Edit ${product.name}`}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-2 rounded-xl bg-slate-50 p-2.5 text-center dark:bg-slate-950/70">
                    <div>
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Stock
                      </span>
                      <span
                        className={`text-base font-bold tabular-nums ${
                          isLow
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {product.stockQty}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Sold
                      </span>
                      <span className="text-base font-bold tabular-nums text-slate-900 dark:text-white">
                        {product.totalSold}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Cost
                      </span>
                      <span className="block text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                        {formatCurrency(effectiveCost)}
                      </span>
                      {product.filamentGrams !== undefined && (
                        <span className="block text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                          {formatGrams(product.filamentGrams)}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Price
                      </span>
                      <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(product.defaultPrice)}
                      </span>
                    </div>
                  </div>

                  {/* Required Filament Swatches */}
                  {product.requiredFilamentIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {product.requiredFilamentIds.map((fid) => (
                        <FilamentChip key={fid} filament={filamentsById.get(fid)} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  {product.status === 'archived' ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleRestore(product)}
                      className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore to Active
                    </button>
                  ) : (
                    <>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Add printed stock:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleQuickStock(product, 1)}
                          className="h-11 min-w-[60px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-bold text-slate-800 transition hover:bg-slate-100 active:scale-95 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleQuickStock(product, 5)}
                          className="h-11 min-w-[60px] rounded-xl bg-indigo-600 px-3.5 text-sm font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
                        >
                          +5
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
