import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { roundCurrency } from './format';
import type { FilamentInput, ProductInput, ProductStatus, Sale, SaleItem } from '../types';

function requireDb() {
  if (!db) {
    throw new Error('Firebase is not configured. Check your VITE_FIREBASE_* environment variables.');
  }
  return db;
}

function cleanOptionalString(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

// ---------- Settings ----------

export async function saveAvgSpoolCost(avgSpoolCost: number): Promise<void> {
  const firestore = requireDb();
  const safeCost = Math.max(0, roundCurrency(avgSpoolCost));
  await setDoc(
    doc(firestore, 'settings', 'pricing'),
    { avgSpoolCost: safeCost },
    { merge: true },
  );
}

export async function saveRestockQueueOrder(productIds: string[]): Promise<void> {
  const firestore = requireDb();
  const deduped = Array.from(new Set(productIds));
  await setDoc(
    doc(firestore, 'settings', 'queue'),
    { order: deduped },
    { merge: true },
  );
}

// ---------- Filaments ----------

export async function createFilament(input: FilamentInput): Promise<void> {
  const firestore = requireDb();
  const brand = cleanOptionalString(input.brand);
  const reorderUrl = cleanOptionalString(input.reorderUrl);

  await addDoc(collection(firestore, 'filaments'), {
    name: input.name.trim(),
    material: input.material.trim(),
    colorHex: input.colorHex.trim() || '#6366f1',
    spoolCount: Math.max(0, Math.round(input.spoolCount * 10) / 10),
    ...(brand ? { brand } : {}),
    ...(reorderUrl ? { reorderUrl } : {}),
  });
}

export async function updateFilament(id: string, input: FilamentInput): Promise<void> {
  const firestore = requireDb();
  const brand = cleanOptionalString(input.brand);
  const reorderUrl = cleanOptionalString(input.reorderUrl);

  await updateDoc(doc(firestore, 'filaments', id), {
    name: input.name.trim(),
    material: input.material.trim(),
    colorHex: input.colorHex.trim() || '#6366f1',
    spoolCount: Math.max(0, Math.round(input.spoolCount * 10) / 10),
    brand: brand ?? deleteField(),
    reorderUrl: reorderUrl ?? deleteField(),
  });
}

export async function adjustFilamentSpools(
  id: string,
  currentCount: number,
  delta: number,
): Promise<void> {
  const firestore = requireDb();
  const nextCount = Math.max(0, Math.round((currentCount + delta) * 10) / 10);
  await updateDoc(doc(firestore, 'filaments', id), {
    spoolCount: nextCount,
  });
}

export async function deleteFilament(id: string): Promise<void> {
  const firestore = requireDb();
  await deleteDoc(doc(firestore, 'filaments', id));
}

// ---------- Products ----------

export async function createProduct(input: ProductInput): Promise<void> {
  const firestore = requireDb();
  const notes = cleanOptionalString(input.notes);
  const hasGrams =
    typeof input.filamentGrams === 'number' &&
    Number.isFinite(input.filamentGrams) &&
    input.filamentGrams >= 0;

  await addDoc(collection(firestore, 'products'), {
    name: input.name.trim(),
    status: input.status,
    stockQty: Math.max(0, Math.round(input.stockQty)),
    lowStockThreshold: Math.max(0, Math.round(input.lowStockThreshold)),
    totalSold: Math.max(0, Math.round(input.totalSold)),
    unitCost: Math.max(0, roundCurrency(input.unitCost)),
    defaultPrice: Math.max(0, roundCurrency(input.defaultPrice)),
    requiredFilamentIds: Array.from(new Set(input.requiredFilamentIds)),
    useCustomCost: Boolean(input.useCustomCost),
    ...(hasGrams ? { filamentGrams: Math.round(input.filamentGrams! * 10) / 10 } : {}),
    ...(notes ? { notes } : {}),
  });
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  const firestore = requireDb();
  const notes = cleanOptionalString(input.notes);
  const hasGrams =
    typeof input.filamentGrams === 'number' &&
    Number.isFinite(input.filamentGrams) &&
    input.filamentGrams >= 0;

  await updateDoc(doc(firestore, 'products', id), {
    name: input.name.trim(),
    status: input.status,
    stockQty: Math.max(0, Math.round(input.stockQty)),
    lowStockThreshold: Math.max(0, Math.round(input.lowStockThreshold)),
    totalSold: Math.max(0, Math.round(input.totalSold)),
    unitCost: Math.max(0, roundCurrency(input.unitCost)),
    defaultPrice: Math.max(0, roundCurrency(input.defaultPrice)),
    requiredFilamentIds: Array.from(new Set(input.requiredFilamentIds)),
    useCustomCost: Boolean(input.useCustomCost),
    filamentGrams: hasGrams ? Math.round(input.filamentGrams! * 10) / 10 : deleteField(),
    notes: notes ?? deleteField(),
  });
}

export async function adjustProductStock(id: string, delta: number): Promise<void> {
  const firestore = requireDb();
  await updateDoc(doc(firestore, 'products', id), {
    stockQty: increment(delta),
  });
}

export async function setProductStatus(id: string, status: ProductStatus): Promise<void> {
  const firestore = requireDb();
  await updateDoc(doc(firestore, 'products', id), {
    status,
  });
}

export async function deleteProduct(id: string): Promise<void> {
  const firestore = requireDb();
  await deleteDoc(doc(firestore, 'products', id));
}

// ---------- Sales & Summary (Atomic Batches) ----------

export interface LogSalePayload {
  items: SaleItem[];
  totalRevenue: number;
  notes?: string;
}

export async function logSale(payload: LogSalePayload): Promise<void> {
  const firestore = requireDb();
  if (payload.items.length === 0) {
    throw new Error('Select at least one product to log a sale.');
  }

  const totalRevenue = Math.max(0, roundCurrency(payload.totalRevenue));
  const totalCost = roundCurrency(
    payload.items.reduce((sum, item) => sum + item.qty * item.unitCostSnapshot, 0),
  );
  const totalUnitsSold = payload.items.reduce((sum, item) => sum + item.qty, 0);

  const batch = writeBatch(firestore);

  // 1. Create /sales document with unitCostSnapshot on each item
  const saleRef = doc(collection(firestore, 'sales'));
  const saleData: Record<string, unknown> = {
    timestamp: serverTimestamp(),
    totalRevenue,
    totalCost,
    items: payload.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      qty: item.qty,
      unitCostSnapshot: roundCurrency(item.unitCostSnapshot),
    })),
  };

  const notes = cleanOptionalString(payload.notes);
  if (notes) {
    saleData.notes = notes;
  }

  batch.set(saleRef, saleData);

  // 2. Decrement stockQty and increment totalSold on each sold product
  for (const item of payload.items) {
    const productRef = doc(firestore, 'products', item.productId);
    batch.update(productRef, {
      stockQty: increment(-item.qty),
      totalSold: increment(item.qty),
    });
  }

  // 3. Increment stats/summary atomically with { merge: true }
  const summaryRef = doc(firestore, 'stats', 'summary');
  batch.set(
    summaryRef,
    {
      totalRevenue: increment(totalRevenue),
      totalCost: increment(totalCost),
      totalUnitsSold: increment(totalUnitsSold),
    },
    { merge: true },
  );

  await batch.commit();
}

export async function undoSale(sale: Sale, existingProductIds: Set<string>): Promise<void> {
  const firestore = requireDb();
  const totalUnitsSold = sale.items.reduce((sum, item) => sum + item.qty, 0);

  const batch = writeBatch(firestore);

  // 1. Delete the sale document
  batch.delete(doc(firestore, 'sales', sale.id));

  // 2. Restore stockQty and decrement totalSold for products that still exist
  for (const item of sale.items) {
    if (existingProductIds.has(item.productId)) {
      const productRef = doc(firestore, 'products', item.productId);
      batch.update(productRef, {
        stockQty: increment(item.qty),
        totalSold: increment(-item.qty),
      });
    }
  }

  // 3. Reverse stats/summary totals atomically
  const summaryRef = doc(firestore, 'stats', 'summary');
  batch.set(
    summaryRef,
    {
      totalRevenue: increment(-roundCurrency(sale.totalRevenue)),
      totalCost: increment(-roundCurrency(sale.totalCost)),
      totalUnitsSold: increment(-totalUnitsSold),
    },
    { merge: true },
  );

  await batch.commit();
}
