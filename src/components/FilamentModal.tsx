import { useEffect, useState, type FormEvent } from 'react';
import { X, Trash2, Loader2, Plus, Minus } from 'lucide-react';
import { createFilament, deleteFilament, updateFilament } from '../lib/firestoreOps';
import type { Filament } from '../types';

interface FilamentModalProps {
  open: boolean;
  filament: Filament | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const MATERIAL_PRESETS = ['PLA Basic', 'Matte PLA', 'Silk PLA', 'PETG', 'TPU', 'ABS', 'Resin'];

const COLOR_PRESETS = [
  '#111827',
  '#f8fafc',
  '#dc2626',
  '#f97316',
  '#eab308',
  '#16a34a',
  '#06b6d4',
  '#2563eb',
  '#7c3aed',
  '#ec4899',
  '#92400e',
  '#64748b',
];

export function FilamentModal({
  open,
  filament,
  onClose,
  onSuccess,
  onError,
}: FilamentModalProps) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [material, setMaterial] = useState('PLA Basic');
  const [colorHex, setColorHex] = useState('#dc2626');
  const [spoolCount, setSpoolCount] = useState('1');
  const [reorderUrl, setReorderUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    setSubmitting(false);

    if (filament) {
      setName(filament.name);
      setBrand(filament.brand ?? '');
      setMaterial(filament.material);
      setColorHex(filament.colorHex || '#6366f1');
      setSpoolCount(String(filament.spoolCount));
      setReorderUrl(filament.reorderUrl ?? '');
    } else {
      setName('');
      setBrand('');
      setMaterial('PLA Basic');
      setColorHex('#2563eb');
      setSpoolCount('1');
      setReorderUrl('');
    }
  }, [open, filament]);

  if (!open) return null;

  const isEditing = Boolean(filament);

  const stepSpool = (delta: number) => {
    const current = Number.parseFloat(spoolCount) || 0;
    const next = Math.max(0, Math.round((current + delta) * 10) / 10);
    setSpoolCount(String(next));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;

    const payload = {
      name: name.trim(),
      brand,
      material: material.trim() || 'PLA Basic',
      colorHex: /^#[0-9a-fA-F]{6}$/.test(colorHex.trim()) ? colorHex.trim() : '#6366f1',
      spoolCount: Math.max(0, Number.parseFloat(spoolCount) || 0),
      reorderUrl,
    };

    setSubmitting(true);
    try {
      if (filament) {
        await updateFilament(filament.id, payload);
        onSuccess(`Updated "${payload.name}"`);
      } else {
        await createFilament(payload);
        onSuccess(`Added "${payload.name}"`);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save filament:', err);
      onError(err instanceof Error ? err.message : 'Failed to save filament.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!filament || submitting) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setSubmitting(true);
    try {
      await deleteFilament(filament.id);
      onSuccess(`Deleted "${filament.name}"`);
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete filament.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="filament-modal-title"
    >
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2
            id="filament-modal-title"
            className="text-base font-bold text-slate-900 dark:text-white"
          >
            {isEditing ? 'Edit Filament' : 'Add Filament'}
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

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="filament-name"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
                >
                  Color / Name *
                </label>
                <input
                  id="filament-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Matte Red"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="filament-brand"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
                >
                  Brand (optional)
                </label>
                <input
                  id="filament-brand"
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Bambu Lab, Polymaker"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            {/* Material */}
            <div>
              <label
                htmlFor="filament-material"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
              >
                Material *
              </label>
              <input
                id="filament-material"
                type="text"
                required
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="e.g. PLA Basic, Silk PLA, PETG, Resin"
                className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {MATERIAL_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setMaterial(preset)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                      material === preset
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Swatch Picker */}
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                Swatch Color
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  aria-label="Pick swatch color"
                  value={/^#[0-9a-fA-F]{6}$/.test(colorHex) ? colorHex : '#6366f1'}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="h-11 w-14 cursor-pointer rounded-xl border border-slate-300 bg-transparent p-1 dark:border-slate-700"
                />
                <input
                  type="text"
                  aria-label="Color hex code"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  placeholder="#dc2626"
                  className="h-11 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3.5 font-mono text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {COLOR_PRESETS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setColorHex(hex)}
                    aria-label={`Select color ${hex}`}
                    className={`h-7 w-7 rounded-full border-2 transition hover:scale-110 ${
                      colorHex.toLowerCase() === hex.toLowerCase()
                        ? 'border-indigo-500 ring-2 ring-indigo-500/40'
                        : 'border-black/15 dark:border-white/25'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>

            {/* Spool Count */}
            <div>
              <label
                htmlFor="filament-spools"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
              >
                Spool Count (supports 0.5 increments)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => stepSpool(-0.5)}
                  className="flex h-11 w-12 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  aria-label="Subtract 0.5 spool"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  id="filament-spools"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  value={spoolCount}
                  onChange={(e) => setSpoolCount(e.target.value)}
                  className="h-11 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-center text-base font-bold tabular-nums text-slate-900 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => stepSpool(0.5)}
                  className="flex h-11 w-12 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  aria-label="Add 0.5 spool"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Reorder URL */}
            <div>
              <label
                htmlFor="filament-reorder-url"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
              >
                Reorder URL (optional)
              </label>
              <input
                id="filament-reorder-url"
                type="url"
                value={reorderUrl}
                onChange={(e) => setReorderUrl(e.target.value)}
                placeholder="https://store.example.com/filament"
                className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950/60">
            <div>
              {isEditing && filament && (
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
                {isEditing ? 'Save Filament' : 'Add Filament'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
