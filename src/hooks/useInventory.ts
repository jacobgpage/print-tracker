import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type {
  Filament,
  Product,
  ProductStatus,
  Sale,
  SaleItem,
  ShoppingListEntry,
  SummaryStats,
} from '../types';

const DEFAULT_SUMMARY: SummaryStats = {
  totalRevenue: 0,
  totalCost: 0,
  totalUnitsSold: 0,
};

const DEFAULT_AVG_SPOOL_COST = 20;

function normalizeStatus(value: unknown): ProductStatus {
  if (value === 'active' || value === 'wishlist' || value === 'archived') {
    return value;
  }
  return 'active';
}

export function useInventory(enabled: boolean) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<SummaryStats>(DEFAULT_SUMMARY);
  const [avgSpoolCost, setAvgSpoolCost] = useState<number>(DEFAULT_AVG_SPOOL_COST);
  const [restockQueueOrder, setRestockQueueOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !db) {
      setProducts([]);
      setFilaments([]);
      setSales([]);
      setSummary(DEFAULT_SUMMARY);
      setAvgSpoolCost(DEFAULT_AVG_SPOOL_COST);
      setRestockQueueOrder([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    let loadedProducts = false;
    let loadedFilaments = false;
    let loadedSales = false;
    let loadedSummary = false;
    let loadedPricing = false;
    let loadedQueue = false;

    const checkLoaded = () => {
      if (
        loadedProducts &&
        loadedFilaments &&
        loadedSales &&
        loadedSummary &&
        loadedPricing &&
        loadedQueue
      ) {
        setLoading(false);
      }
    };

    const handleSnapshotError = (err: Error) => {
      console.error('Firestore subscription error:', err);
      setError(err.message || 'Failed to sync with Firestore.');
      setLoading(false);
    };

    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        const list: Product[] = snap.docs.map((d) => {
          const data = d.data();
          const parsedGrams =
            typeof data.filamentGrams === 'number' && Number.isFinite(data.filamentGrams)
              ? data.filamentGrams
              : undefined;
          return {
            id: d.id,
            name: String(data.name ?? ''),
            status: normalizeStatus(data.status),
            stockQty: Number(data.stockQty ?? 0),
            lowStockThreshold: Number(data.lowStockThreshold ?? 0),
            totalSold: Number(data.totalSold ?? 0),
            filamentGrams: parsedGrams,
            useCustomCost: Boolean(data.useCustomCost),
            unitCost: Number(data.unitCost ?? 0),
            defaultPrice: Number(data.defaultPrice ?? 0),
            requiredFilamentIds: Array.isArray(data.requiredFilamentIds)
              ? data.requiredFilamentIds.map(String)
              : [],
            notes: typeof data.notes === 'string' && data.notes.trim() ? data.notes : undefined,
          };
        });
        setProducts(list);
        loadedProducts = true;
        checkLoaded();
      },
      handleSnapshotError,
    );

    const unsubFilaments = onSnapshot(
      collection(db, 'filaments'),
      (snap) => {
        const list: Filament[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: String(data.name ?? ''),
            brand: typeof data.brand === 'string' && data.brand.trim() ? data.brand : undefined,
            material: String(data.material ?? 'PLA'),
            colorHex: String(data.colorHex ?? '#6366f1'),
            spoolCount: Number(data.spoolCount ?? 0),
            reorderUrl:
              typeof data.reorderUrl === 'string' && data.reorderUrl.trim()
                ? data.reorderUrl
                : undefined,
          };
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        setFilaments(list);
        loadedFilaments = true;
        checkLoaded();
      },
      handleSnapshotError,
    );

    const salesQuery = query(
      collection(db, 'sales'),
      orderBy('timestamp', 'desc'),
      limit(50),
    );

    const unsubSales = onSnapshot(
      salesQuery,
      (snap) => {
        const list: Sale[] = snap.docs.map((d) => {
          const data = d.data();
          const rawItems = Array.isArray(data.items) ? data.items : [];
          const items: SaleItem[] = rawItems.map((item: Record<string, unknown>) => ({
            productId: String(item.productId ?? ''),
            productName: String(item.productName ?? 'Unknown item'),
            qty: Number(item.qty ?? 0),
            unitCostSnapshot: Number(item.unitCostSnapshot ?? 0),
          }));
          return {
            id: d.id,
            timestamp: (data.timestamp as Timestamp | null) ?? null,
            totalRevenue: Number(data.totalRevenue ?? 0),
            totalCost: Number(data.totalCost ?? 0),
            notes: typeof data.notes === 'string' && data.notes.trim() ? data.notes : undefined,
            items,
          };
        });
        setSales(list);
        loadedSales = true;
        checkLoaded();
      },
      handleSnapshotError,
    );

    const unsubSummary = onSnapshot(
      doc(db, 'stats', 'summary'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSummary({
            totalRevenue: Number(data.totalRevenue ?? 0),
            totalCost: Number(data.totalCost ?? 0),
            totalUnitsSold: Number(data.totalUnitsSold ?? 0),
          });
        } else {
          setSummary(DEFAULT_SUMMARY);
        }
        loadedSummary = true;
        checkLoaded();
      },
      handleSnapshotError,
    );

    const unsubPricing = onSnapshot(
      doc(db, 'settings', 'pricing'),
      (snap) => {
        if (snap.exists()) {
          const val = Number(snap.data().avgSpoolCost);
          setAvgSpoolCost(Number.isFinite(val) && val >= 0 ? val : DEFAULT_AVG_SPOOL_COST);
        } else {
          setAvgSpoolCost(DEFAULT_AVG_SPOOL_COST);
        }
        loadedPricing = true;
        checkLoaded();
      },
      handleSnapshotError,
    );

    const unsubQueue = onSnapshot(
      doc(db, 'settings', 'queue'),
      (snap) => {
        if (snap.exists()) {
          const rawOrder = snap.data().order;
          setRestockQueueOrder(Array.isArray(rawOrder) ? rawOrder.map(String) : []);
        } else {
          setRestockQueueOrder([]);
        }
        loadedQueue = true;
        checkLoaded();
      },
      handleSnapshotError,
    );

    return () => {
      unsubProducts();
      unsubFilaments();
      unsubSales();
      unsubSummary();
      unsubPricing();
      unsubQueue();
    };
  }, [enabled]);

  const filamentsById = useMemo(() => {
    const map = new Map<string, Filament>();
    for (const filament of filaments) {
      map.set(filament.id, filament);
    }
    return map;
  }, [filaments]);

  const activeProducts = useMemo(
    () =>
      products
        .filter((p) => p.status === 'active')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  );

  const wishlistProducts = useMemo(
    () =>
      products
        .filter((p) => p.status === 'wishlist')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  );

  const archivedProducts = useMemo(
    () =>
      products
        .filter((p) => p.status === 'archived')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  );

  // Active products at or below lowStockThreshold, ordered by manual priority (if set) then totalSold desc
  const { restockQueue, hasCustomRestockOrder } = useMemo(() => {
    const orderMap = new Map<string, number>();
    restockQueueOrder.forEach((id, idx) => orderMap.set(id, idx));

    const queue = products
      .filter((p) => p.status === 'active' && p.stockQty <= p.lowStockThreshold)
      .sort((a, b) => {
        const aIdx = orderMap.get(a.id);
        const bIdx = orderMap.get(b.id);
        if (aIdx !== undefined && bIdx !== undefined) return aIdx - bIdx;
        if (aIdx !== undefined) return -1;
        if (bIdx !== undefined) return 1;
        if (b.totalSold !== a.totalSold) return b.totalSold - a.totalSold;
        if (a.stockQty !== b.stockQty) return a.stockQty - b.stockQty;
        return a.name.localeCompare(b.name);
      });

    const hasCustom = queue.some((p) => orderMap.has(p.id));
    return { restockQueue: queue, hasCustomRestockOrder: hasCustom };
  }, [products, restockQueueOrder]);

  // Deduplicated filaments with spoolCount <= 0 needed by restockQueue or wishlist
  const shoppingList = useMemo<ShoppingListEntry[]>(() => {
    const entries = new Map<string, ShoppingListEntry>();

    const registerProduct = (product: Product, source: 'restock' | 'wishlist') => {
      for (const filamentId of product.requiredFilamentIds) {
        const filament = filamentsById.get(filamentId);
        if (!filament || filament.spoolCount > 0) continue;

        let entry = entries.get(filament.id);
        if (!entry) {
          entry = { filament, neededBy: [] };
          entries.set(filament.id, entry);
        }
        if (!entry.neededBy.some((n) => n.id === product.id)) {
          entry.neededBy.push({ id: product.id, name: product.name, source });
        }
      }
    };

    for (const product of restockQueue) {
      registerProduct(product, 'restock');
    }
    for (const product of wishlistProducts) {
      registerProduct(product, 'wishlist');
    }

    return Array.from(entries.values()).sort((a, b) => {
      const aHasRestock = a.neededBy.some((n) => n.source === 'restock') ? 1 : 0;
      const bHasRestock = b.neededBy.some((n) => n.source === 'restock') ? 1 : 0;
      if (bHasRestock !== aHasRestock) return bHasRestock - aHasRestock;
      if (b.neededBy.length !== a.neededBy.length) {
        return b.neededBy.length - a.neededBy.length;
      }
      return a.filament.name.localeCompare(b.filament.name);
    });
  }, [filamentsById, restockQueue, wishlistProducts]);

  return {
    products,
    activeProducts,
    wishlistProducts,
    archivedProducts,
    filaments,
    filamentsById,
    sales,
    summary,
    avgSpoolCost,
    restockQueue,
    hasCustomRestockOrder,
    shoppingList,
    loading,
    error,
  };
}
