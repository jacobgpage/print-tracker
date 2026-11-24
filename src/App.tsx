import { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import type { User } from 'firebase/auth';
import { useAuth } from './hooks/useAuth';
import { useInventory } from './hooks/useInventory';
import { useTheme } from './hooks/useTheme';
import { LoginScreen } from './components/LoginScreen';
import { Layout } from './components/Layout';
import { DashboardTab } from './components/DashboardTab';
import { InventoryTab } from './components/InventoryTab';
import { WishlistTab } from './components/WishlistTab';
import { FilamentsTab } from './components/FilamentsTab';
import { LogSaleModal } from './components/LogSaleModal';
import { ProductModal } from './components/ProductModal';
import { FilamentModal } from './components/FilamentModal';
import { Toast } from './components/Toast';
import type { Filament, Product, ProductStatus, TabId, ToastMessage } from './types';

interface AuthenticatedAppProps {
  user: User;
  onSignOut: () => Promise<void>;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

function AuthenticatedApp({
  user,
  onSignOut,
  theme,
  onToggleTheme,
}: AuthenticatedAppProps) {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [logSaleOpen, setLogSaleOpen] = useState(false);

  const [productModalState, setProductModalState] = useState<{
    open: boolean;
    product: Product | null;
    defaultStatus: ProductStatus;
  }>({ open: false, product: null, defaultStatus: 'active' });

  const [filamentModalState, setFilamentModalState] = useState<{
    open: boolean;
    filament: Filament | null;
  }>({ open: false, filament: null });

  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((text: string, tone: ToastMessage['tone']) => {
    setToast({ id: Date.now(), text, tone });
  }, []);

  const onSuccess = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
  const onError = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const {
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
  } = useInventory(true);

  const openAddProduct = (defaultStatus: ProductStatus) => {
    setProductModalState({ open: true, product: null, defaultStatus });
  };

  const openEditProduct = (product: Product) => {
    setProductModalState({ open: true, product, defaultStatus: product.status });
  };

  const openAddFilament = () => {
    setFilamentModalState({ open: true, filament: null });
  };

  const openEditFilament = (filament: Filament) => {
    setFilamentModalState({ open: true, filament });
  };

  return (
    <Layout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onOpenLogSale={() => setLogSaleOpen(true)}
      onSignOut={() => void onSignOut()}
      theme={theme}
      onToggleTheme={onToggleTheme}
      restockCount={restockQueue.length}
      shoppingCount={shoppingList.length}
      userEmail={user.email}
    >
      {error && (
        <div className="mb-5 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <div className="space-y-1">
              <p className="font-bold">Firestore sync error</p>
              <p className="text-xs leading-relaxed">{error}</p>
              <p className="text-xs leading-relaxed opacity-90">
                Make sure <code className="rounded bg-black/10 px-1 py-0.5 font-mono">firestore.rules</code>{' '}
                allows your User UID:{' '}
                <code className="select-all rounded bg-black/10 px-1.5 py-0.5 font-mono font-semibold">
                  {user.uid}
                </code>
              </p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500 dark:text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="mt-3 text-sm font-medium">Syncing inventory...</p>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <DashboardTab
              summary={summary}
              restockQueue={restockQueue}
              hasCustomRestockOrder={hasCustomRestockOrder}
              sales={sales}
              products={products}
              filamentsById={filamentsById}
              onOpenLogSale={() => setLogSaleOpen(true)}
              onSuccess={onSuccess}
              onError={onError}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryTab
              activeProducts={activeProducts}
              archivedProducts={archivedProducts}
              filamentsById={filamentsById}
              avgSpoolCost={avgSpoolCost}
              onOpenLogSale={() => setLogSaleOpen(true)}
              onAddProduct={() => openAddProduct('active')}
              onEditProduct={openEditProduct}
              onSuccess={onSuccess}
              onError={onError}
            />
          )}

          {activeTab === 'wishlist' && (
            <WishlistTab
              wishlistProducts={wishlistProducts}
              filamentsById={filamentsById}
              avgSpoolCost={avgSpoolCost}
              onAddWishlist={() => openAddProduct('wishlist')}
              onEditProduct={openEditProduct}
              onSuccess={onSuccess}
              onError={onError}
            />
          )}

          {activeTab === 'filaments' && (
            <FilamentsTab
              filaments={filaments}
              shoppingList={shoppingList}
              avgSpoolCost={avgSpoolCost}
              onAddFilament={openAddFilament}
              onEditFilament={openEditFilament}
              onSuccess={onSuccess}
              onError={onError}
            />
          )}
        </>
      )}

      {/* Modals */}
      <LogSaleModal
        open={logSaleOpen}
        activeProducts={activeProducts}
        avgSpoolCost={avgSpoolCost}
        onClose={() => setLogSaleOpen(false)}
        onSuccess={onSuccess}
        onError={onError}
      />

      <ProductModal
        open={productModalState.open}
        product={productModalState.product}
        defaultStatus={productModalState.defaultStatus}
        filaments={filaments}
        avgSpoolCost={avgSpoolCost}
        onClose={() => setProductModalState((prev) => ({ ...prev, open: false }))}
        onSuccess={onSuccess}
        onError={onError}
      />

      <FilamentModal
        open={filamentModalState.open}
        filament={filamentModalState.filament}
        onClose={() => setFilamentModalState((prev) => ({ ...prev, open: false }))}
        onSuccess={onSuccess}
        onError={onError}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </Layout>
  );
}

export function App() {
  const { user, loading, signIn, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        onSignIn={signIn}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <AuthenticatedApp
      user={user}
      onSignOut={signOut}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}

export default App;
