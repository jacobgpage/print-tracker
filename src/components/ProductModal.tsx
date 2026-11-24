import { useEffect, useState, type FormEvent } from 'react';
import { X, Check, Archive, RotateCcw, Trash2, Loader2, Calculator } from 'lucide-react';
import {
  createProduct,
  deleteProduct,
  setProductStatus,
  updateProduct,
} from '../lib/firestoreOps';
import { calculateFilamentCost, formatCurrency, formatSpools } from '../lib/format';
import type { Filament, Product, ProductStatus } from '../types';

interface ProductModalProps {
  open: boolean;
  product: Product | null;
  defaultStatus: ProductStatus;
  filaments: Filament[];
  avgSpoolCost: number;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function ProductModal({
  open,
  product,
  defaultStatus,
  filaments,
  avgSpoolCost,
  onClose,
  onSuccess,
  onError,
}: ProductModalProps) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<ProductStatus>(defaultStatus);
  const [stockQty, setStockQty] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('0');
  const [filamentGrams, setFilamentGrams] = useState('');
  const [useCustomCost, setUseCustomCost] = useState(false);
  const [unitCost, setUnitCost] = useState('0');
  const [defaultPrice, setDefaultPrice] = useState('25');
  const [requiredFilamentIds, setRequiredFilamentIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    setSubmitting(false);

    if (product) {
      const legacyManualCost =
        product.useCustomCost ||
        (product.filamentGrams === undefined && product.unitCost > 0);
      setName(product.name);
      setStatus(product.status);
      setStockQty(String(product.stockQty));
      setLowStockThreshold(String(product.lowStockThreshold));
      setFilamentGrams(
        product.filamentGrams !== undefined ? String(product.filamentGrams) : '',
      );
      setUseCustomCost(legacyManualCost);
      setUnitCost(String(product.unitCost));
      setDefaultPrice(String(product.defaultPrice));
      setRequiredFilamentIds(product.requiredFilamentIds);
      setNotes(product.notes ?? '');
    } else {
      setName('');
      setStatus(defaultStatus);
      setStockQty('0');
      setLowStockThreshold('0');
      setFilamentGrams('');
      setUseCustomCost(false);
      setUnitCost('0');
      setDefaultPrice('25');
      setRequiredFilamentIds([]);
      setNotes('');
    }
  }, [open, product, defaultStatus]);

  if (!open) return null;

  const isEditing = Boolean(product);
  const parsedGrams = Number.parseFloat(filamentGrams);
  const hasValidGrams = filamentGrams.trim() !== '' && Number.isFinite(parsedGrams) && parsedGrams >= 0;
  const calculatedCost = calculateFilamentCost(hasValidGrams ? parsedGrams : 0, avgSpoolCost);

  const toggleFilament = (id: string) => {
    setRequiredFilamentIds((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;

    const finalUnitCost = useCustomCost
      ? Number.parseFloat(unitCost) || 0
      : calculatedCost;

    const payload = {
      name: name.trim(),
      status,
      stockQty: Number.parseInt(stockQty, 10) || 0,
      lowStockThreshold: Number.parseInt(lowStockThreshold, 10) || 0,
      totalSold: product?.totalSold ?? 0,
      filamentGrams: hasValidGrams ? parsedGrams : undefined,
      useCustomCost,
      unitCost: finalUnitCost,
      defaultPrice: Number.parseFloat(defaultPrice) || 0,
      requiredFilamentIds,
      notes,
    };

    setSubmitting(true);
    try {
      if (product) {
        await updateProduct(product.id, payload);
        onSuccess(`Updated "${payload.name}"`);
      } else {
        await createProduct(payload);
        onSuccess(
          payload.status === 'wishlist'
            ? `Added "${payload.name}" to wishlist`
            : `Added "${payload.name}" to inventory`,
        );
      }
      onClose();
    } catch (err) {
      console.error('Failed to save product:', err);
      onError(err instanceof Error ? err.message : 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!product || submitting) return;
    const nextStatus: ProductStatus = product.status === 'archived' ? 'active' : 'archived';
    setSubmitting(true);
    try {
      await setProductStatus(product.id, nextStatus);
      onSuccess(
        nextStatus === 'archived'
          ? `Archived "${product.name}"`
          : `Restored "${product.name}" to active`,
      );
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update product status.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!product || submitting) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSubmitting(true);
    try {
      await deleteProduct(product.id);
      onSuccess(`Deleted "${product.name}"`);
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete product.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
    >
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2
            id="product-modal-title"
            className="text-base font-bold text-slate-900 dark:text-white"
          >
            {isEditing
              ? 'Edit Product'
              : defaultStatus === 'wishlist'
                ? 'Add Wishlist Print'
                : 'Add Product'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div>
              <label
                htmlFor="product-name"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
              >
                Print Name *
              </label>
              <input
                id="product-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Articulated Crystal Dragon"
                className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['active', 'wishlist', 'archived'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setStatus(opt)}
                  className={`h-10 rounded-xl border text-xs font-semibold capitalize transition ${
                    status === opt
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="product-stock"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
                >
                  Stock Qty
                </label>
                <input
                  id="product-stock"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm font-semibold tabular-nums text-slate-900 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="product-low-stock"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
                >
                  Low Stock Alert (&le;)
                </label>
                <input
                  id="product-low-stock"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm font-semibold tabular-nums text-slate-900 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="product-grams"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
                >
                  Filament Used (g)
                </label>
                <input
                  id="product-grams"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={filamentGrams}
                  onChange={(e) => setFilamentGrams(e.target.value)}
                  placeholder="e.g. 45"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm font-semibold tabular-nums text-slate-900 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="product-default-price"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
                >
                  Default Price ($)
                </label>
                <input
                  id="product-default-price"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={defaultPrice}
                  onChange={(e) => setDefaultPrice(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm font-semibold tabular-nums text-slate-900 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            {/* Auto-calculated Cost Preview + Optional Manual Override */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Calculated Cost:
                  </span>
                  <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(calculatedCost)}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  at {formatCurrency(avgSpoolCost)}/kg
                </span>
              </div>

              <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={useCustomCost}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUseCustomCost(checked);
                    if (checked && (Number.parseFloat(unitCost) || 0) === 0) {
                      setUnitCost(calculatedCost.toFixed(2));
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600"
                />
                Override unit cost manually (e.g. magnets or hardware)
              </label>

              {useCustomCost && (
                <div className="mt-2.5">
                  <label
                    htmlFor="product-unit-cost"
                    className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
                  >
                    Custom Unit Cost ($)
                  </label>
                  <input
                    id="product-unit-cost"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold tabular-nums text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* Required Filaments Multi-Select */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  Required Filaments ({requiredFilamentIds.length})
                </span>
                {requiredFilamentIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRequiredFilamentIds([])}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Clear
                  </button>
                )}
              </div>

              {filaments.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No filaments added yet. Add filaments in the Filaments tab to link them here.
                </p>
              ) : (
                <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
                  {filaments.map((filament) => {
                    const selected = requiredFilamentIds.includes(filament.id);
                    return (
                      <button
                        key={filament.id}
                        type="button"
                        onClick={() => toggleFilament(filament.id)}
                        className={`flex min-h-[42px] w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${
                          selected
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-900 dark:border-indigo-500/70 dark:bg-indigo-500/15 dark:text-indigo-100'
                            : 'border-transparent bg-white text-slate-700 hover:border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="h-4 w-4 shrink-0 rounded-full border border-black/15 dark:border-white/25"
                            style={{ backgroundColor: filament.colorHex }}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{filament.name}</p>
                            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                              {filament.material}
                              {filament.brand ? ` • ${filament.brand}` : ''} •{' '}
                              {formatSpools(filament.spoolCount)} spools
                            </p>
                          </div>
                        </div>
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            selected
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {selected && <Check className="h-3.5 w-3.5" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="product-notes"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
              >
                Notes (optional)
              </label>
              <textarea
                id="product-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Print time, nozzle size, STL source, or multicolor notes..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center gap-2">
              {isEditing && product && (
                <>
                  <button
                    type="button"
                    onClick={handleArchiveToggle}
                    disabled={submitting}
                    className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {product.status === 'archived' ? (
                      <>
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore
                      </>
                    ) : (
                      <>
                        <Archive className="h-3.5 w-3.5" />
                        Archive
                      </>
                    )}
                  </button>

                  {product.status !== 'active' && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={submitting}
                      className={`inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition ${
                        confirmDelete
                          ? 'bg-rose-600 text-white hover:bg-rose-700'
                          : 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                      }`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {confirmDelete ? 'Confirm Delete' : 'Delete'}
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Add Print'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
