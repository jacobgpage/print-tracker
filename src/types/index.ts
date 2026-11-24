import type { Timestamp } from 'firebase/firestore';

export type ProductStatus = 'active' | 'wishlist' | 'archived';

export interface Filament {
  id: string;
  name: string;
  brand?: string;
  material: string;
  colorHex: string;
  spoolCount: number;
  reorderUrl?: string;
}

export type FilamentInput = Omit<Filament, 'id'>;

export interface Product {
  id: string;
  name: string;
  status: ProductStatus;
  stockQty: number;
  lowStockThreshold: number;
  totalSold: number;
  filamentGrams?: number;
  useCustomCost?: boolean;
  unitCost: number;
  defaultPrice: number;
  requiredFilamentIds: string[];
  notes?: string;
}

export type ProductInput = Omit<Product, 'id'>;

export interface PricingSettings {
  avgSpoolCost: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  qty: number;
  unitCostSnapshot: number;
}

export interface Sale {
  id: string;
  timestamp: Timestamp | null;
  totalRevenue: number;
  totalCost: number;
  notes?: string;
  items: SaleItem[];
}

export interface SummaryStats {
  totalRevenue: number;
  totalCost: number;
  totalUnitsSold: number;
}

export interface ShoppingListEntry {
  filament: Filament;
  neededBy: Array<{
    id: string;
    name: string;
    source: 'restock' | 'wishlist';
  }>;
}

export type TabId = 'dashboard' | 'inventory' | 'wishlist' | 'filaments';

export interface ToastMessage {
  id: number;
  text: string;
  tone: 'success' | 'error' | 'info';
}
