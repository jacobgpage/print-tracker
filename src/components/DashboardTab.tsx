import { useState, type DragEvent } from 'react';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  PackageCheck,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Loader2,
  ShoppingBag,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ArrowDownWideNarrow,
} from 'lucide-react';
import {
  adjustProductStock,
  saveRestockQueueOrder,
  undoSale,
} from '../lib/firestoreOps';
import { formatCurrency, formatSaleDate, roundCurrency } from '../lib/format';
import { FilamentChip } from './FilamentChip';
import type { Filament, Product, Sale, SummaryStats } from '../types';

interface DashboardTabProps {
  summary: SummaryStats;
  restockQueue: Product[];
  hasCustomRestockOrder: boolean;
  sales: Sale[];
  products: Product[];
  filamentsById: Map<string, Filament>;
  onOpenLogSale: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function DashboardTab({
  summary,
  restockQueue,
  hasCustomRestockOrder,
  sales,
  products,
  filamentsById,
  onOpenLogSale,
  onSuccess,
  onError,
}: DashboardTabProps) {
  const [salesExpanded, setSalesExpanded] = useState(true);
  const [confirmUndoId, setConfirmUndoId] = useState<string | null>(null);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [busyStockId, setBusyStockId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const netProfit = roundCurrency(summary.totalRevenue - summary.totalCost);
  const profitMargin =
    summary.totalRevenue > 0 ? Math.round((netProfit / summary.totalRevenue) * 100) : 0;

  const persistQueueOrder = async (nextIds: string[], toastMsg?: string) => {
    setSavingOrder(true);
    try {
      await saveRestockQueueOrder(nextIds);
      if (toastMsg) onSuccess(toastMsg);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save queue order.');
    } finally {
      setSavingOrder(false);
    }
  };

  const handleMoveItem = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= restockQueue.length) return;
    const ids = restockQueue.map((p) => p.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(targetIndex, 0, moved);
    await persistQueueOrder(ids);
  };

  const handleResetOrder = async () => {
    await persistQueueOrder([], 'Queue reset to Top Sellers order');
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, productId: string) => {
    setDraggedId(productId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', productId);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, productId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedId && draggedId !== productId && dragOverId !== productId) {
      setDragOverId(productId);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    const sourceId = draggedId || e.dataTransfer.getData('text/plain');
    setDraggedId(null);
    setDragOverId(null);

    if (!sourceId || sourceId === targetId) return;

    const ids = restockQueue.map((p) => p.id);
    const fromIndex = ids.indexOf(sourceId);
    const toIndex = ids.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const [moved] = ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, moved);
    await persistQueueOrder(ids);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleQuickRestock = async (product: Product, delta: number) => {
    setBusyStockId(product.id);
    try {
      await adjustProductStock(product.id, delta);
      onSuccess(`Added +${delta} to "${product.name}"`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update stock.');
    } finally {
      setBusyStockId(null);
    }
  };

  const handleUndoSale = async (sale: Sale) => {
    if (confirmUndoId !== sale.id) {
      setConfirmUndoId(sale.id);
      return;
    }

    setUndoingId(sale.id);
    try {
      const existingIds = new Set(products.map((p) => p.id));
      await undoSale(sale, existingIds);
      setConfirmUndoId(null);
      onSuccess(`Undid sale (${formatCurrency(sale.totalRevenue)})`);
    } catch (err) {
      console.error('Failed to undo sale:', err);
      onError(err instanceof Error ? err.message : 'Failed to undo sale.');
    } finally {
      setUndoingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <section aria-label="Sales performance overview">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Total Revenue
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
                <DollarSign className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2.5 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {formatCurrency(summary.totalRevenue)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Total Cost (COGS)
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Receipt className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2.5 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {formatCurrency(summary.totalCost)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Net Profit
              </span>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  netProfit >= 0
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                    : 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>
            <p
              className={`mt-2.5 text-2xl font-bold tabular-nums ${
                netProfit >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(netProfit)}
            </p>
            {summary.totalRevenue > 0 && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {profitMargin}% margin
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Units Sold
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                <PackageCheck className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2.5 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {summary.totalUnitsSold.toLocaleString()}
            </p>
          </div>
        </div>
      </section>

      {/* Priority Restock Queue */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Priority Restock Queue
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {hasCustomRestockOrder
                ? 'Custom manual order — drag rows or tap arrows to reprioritize'
                : 'Active prints at or below stock threshold, ranked by top sellers — drag or use arrows to reorder'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasCustomRestockOrder && restockQueue.length > 1 && (
              <button
                type="button"
                disabled={savingOrder}
                onClick={handleResetOrder}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <ArrowDownWideNarrow className="h-3.5 w-3.5" />
                Reset to Top Sellers
              </button>
            )}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                restockQueue.length > 0
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
              }`}
            >
              {restockQueue.length} {restockQueue.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        {restockQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
            <CheckCircle2 className="mb-2 h-9 w-9 text-emerald-500" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              All active prints are stocked!
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Items will appear here automatically when stock drops to or below their threshold.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {restockQueue.map((product, index) => {
              const missingFilaments = product.requiredFilamentIds
                .map((fid) => ({ id: fid, filament: filamentsById.get(fid) }))
                .filter((entry) => !entry.filament || entry.filament.spoolCount <= 0);
              const allFilamentsInStock = missingFilaments.length === 0;
              const isBusy = busyStockId === product.id;
              const isDragging = draggedId === product.id;
              const isDragOver = dragOverId === product.id;
              const canReorder = restockQueue.length > 1;

              return (
                <div
                  key={product.id}
                  draggable={canReorder}
                  onDragStart={(e) => handleDragStart(e, product.id)}
                  onDragOver={(e) => handleDragOver(e, product.id)}
                  onDrop={(e) => void handleDrop(e, product.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex flex-col gap-3 px-4 py-4 transition sm:flex-row sm:items-center sm:justify-between sm:px-5 ${
                    isDragging ? 'opacity-40' : ''
                  } ${
                    isDragOver
                      ? 'bg-indigo-50/70 ring-2 ring-inset ring-indigo-500 dark:bg-indigo-950/40'
                      : ''
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2.5">
                    {canReorder && (
                      <div
                        className="mt-0.5 hidden shrink-0 cursor-grab text-slate-400 active:cursor-grabbing dark:text-slate-500 sm:flex"
                        title="Drag to reorder"
                        aria-hidden="true"
                      >
                        <GripVertical className="h-5 w-5" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {index + 1}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {product.name}
                        </h3>
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                          Stock: {product.stockQty}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {product.totalSold} sold
                        </span>
                      </div>

                      {/* Filament Availability Badge */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {allFilamentsInStock ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            All filaments in stock
                          </span>
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:border-rose-700/60 dark:bg-rose-950/60 dark:text-rose-300">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Missing:
                            </span>
                            {missingFilaments.map((entry) => (
                              <FilamentChip
                                key={entry.id}
                                filament={entry.filament}
                                statusColored
                              />
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reorder + Quick restock actions */}
                  <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                    {canReorder && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0 || savingOrder}
                          onClick={() => void handleMoveItem(index, -1)}
                          aria-label={`Move ${product.name} up in queue`}
                          title="Move up"
                          className="flex h-11 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 active:scale-95 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={index === restockQueue.length - 1 || savingOrder}
                          onClick={() => void handleMoveItem(index, 1)}
                          aria-label={`Move ${product.name} down in queue`}
                          title="Move down"
                          className="flex h-11 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 active:scale-95 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleQuickRestock(product, 1)}
                        className="h-11 min-w-[54px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 transition hover:bg-slate-100 active:scale-95 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleQuickRestock(product, 5)}
                        className="h-11 min-w-[54px] rounded-xl bg-indigo-600 px-3 text-sm font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
                      >
                        +5
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Sales (Collapsible) */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setSalesExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Sales ({sales.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Latest 50 transactions with one-tap Undo
            </p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {salesExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </span>
        </button>

        {salesExpanded && (
          <div className="border-t border-slate-200 dark:border-slate-800">
            {sales.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
                <ShoppingBag className="mb-2 h-8 w-8 text-slate-400" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  No sales recorded yet
                </p>
                <button
                  type="button"
                  onClick={onOpenLogSale}
                  className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Log First Sale
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {sales.map((sale) => {
                  const saleProfit = roundCurrency(sale.totalRevenue - sale.totalCost);
                  const isConfirming = confirmUndoId === sale.id;
                  const isUndoing = undoingId === sale.id;

                  return (
                    <div
                      key={sale.id}
                      className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                            {formatCurrency(sale.totalRevenue)}
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(saleProfit)} profit
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {formatSaleDate(sale.timestamp)}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                          {sale.items
                            .map((item) => `${item.qty}× ${item.productName}`)
                            .join(', ')}
                        </p>

                        {sale.notes && (
                          <p className="mt-0.5 text-xs italic text-slate-500 dark:text-slate-400">
                            &ldquo;{sale.notes}&rdquo;
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {isConfirming && (
                          <button
                            type="button"
                            disabled={isUndoing}
                            onClick={() => setConfirmUndoId(null)}
                            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isUndoing}
                          onClick={() => handleUndoSale(sale)}
                          className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition disabled:opacity-50 ${
                            isConfirming
                              ? 'bg-rose-600 text-white hover:bg-rose-700'
                              : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-rose-700 dark:hover:bg-rose-950/60 dark:hover:text-rose-300'
                          }`}
                        >
                          {isUndoing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          {isConfirming ? 'Confirm Undo' : 'Undo Sale'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
