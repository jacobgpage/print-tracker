import type { Timestamp } from 'firebase/firestore';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return currencyFormatter.format(safeValue);
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatSpools(count: number): string {
  const rounded = Math.round(count * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

export function formatSaleDate(timestamp: Timestamp | null): string {
  if (!timestamp) return 'Just now';
  const date = timestamp.toDate();
  const now = new Date();
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isSameDay) {
    return `Today, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function sanitizeExternalUrl(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function getContrastTextColor(hexColor: string): '#0f172a' | '#ffffff' {
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return '#0f172a';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return '#0f172a';
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#0f172a' : '#ffffff';
}

export function calculateFilamentCost(grams: number, avgSpoolCost: number): number {
  const safeGrams = Number.isFinite(grams) && grams > 0 ? grams : 0;
  const safeSpoolCost = Number.isFinite(avgSpoolCost) && avgSpoolCost > 0 ? avgSpoolCost : 0;
  return roundCurrency((safeGrams / 1000) * safeSpoolCost);
}

export function resolveProductUnitCost(
  product: { filamentGrams?: number; unitCost: number; useCustomCost?: boolean },
  avgSpoolCost: number,
): number {
  if (product.useCustomCost) {
    return roundCurrency(Math.max(0, product.unitCost || 0));
  }
  if (typeof product.filamentGrams === 'number' && Number.isFinite(product.filamentGrams)) {
    return calculateFilamentCost(product.filamentGrams, avgSpoolCost);
  }
  return roundCurrency(Math.max(0, product.unitCost || 0));
}

export function formatGrams(grams: number): string {
  const rounded = Math.round(grams * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}g`;
}
