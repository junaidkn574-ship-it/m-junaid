import { useEffect, useState } from 'react';
import {
  completeSaleTransaction,
  DEFAULT_SETTINGS,
  deleteProduct,
  exportBackupData,
  getAllProducts,
  getAllSales,
  getSettings,
  importBackupData,
  initializePosDatabase,
  saveProduct,
  saveSettings,
} from './db/indexedDb';
import type {
  BackupPayload,
  CartItem,
  PaymentMode,
  Product,
  SaleRecord,
  ShopSettings,
} from './types/pos';
import { TopBar, type ActiveTab } from './components/TopBar';
import { PosTerminal } from './components/PosTerminal';
import { AdminDashboard } from './components/AdminDashboard';
import { PinGateModal } from './components/PinGateModal';
import { ReceiptPreviewModal, ThermalReceiptPrintArea } from './components/ThermalReceipt';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SETTINGS);

  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  const [activePrintSale, setActivePrintSale] = useState<SaleRecord | null>(null);
  const [previewSale, setPreviewSale] = useState<SaleRecord | null>(null);

  useEffect(() => {
    let mounted = true;
    initializePosDatabase()
      .then((data) => {
        if (!mounted) return;
        setProducts(data.products);
        setSales(data.sales);
        setSettings(data.settings);
        if (data.sales.length > 0) {
          setActivePrintSale(data.sales[0]);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setDbError(err instanceof Error ? err.message : 'Unable to initialize offline IndexedDB database.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const triggerThermalPrint = (sale: SaleRecord) => {
    setActivePrintSale(sale);
    // Allow React to flush the receipt DOM before calling window.print()
    window.setTimeout(() => {
      window.print();
    }, 80);
  };

  const handleSelectTab = (tab: ActiveTab) => {
    if (tab === 'admin' && !isAdminUnlocked) {
      setShowPinModal(true);
      return;
    }
    setActiveTab(tab);
  };

  const handleCompleteSale = async (
    cartItems: CartItem[],
    discount: number,
    paymentMode: PaymentMode
  ) => {
    const result = await completeSaleTransaction(cartItems, discount, paymentMode);
    setProducts(result.updatedProducts);
    setSales((prev) => [result.sale, ...prev]);
    setSettings(result.updatedSettings);
    triggerThermalPrint(result.sale);
  };

  const handleSaveProduct = async (product: Product) => {
    await saveProduct(product);
    const updated = await getAllProducts();
    setProducts(updated);
  };

  const handleDeleteProduct = async (productId: string) => {
    await deleteProduct(productId);
    const updated = await getAllProducts();
    setProducts(updated);
  };

  const handleSaveSettings = async (nextSettings: ShopSettings) => {
    await saveSettings(nextSettings);
    setSettings(nextSettings);
  };

  const handleImportBackup = async (payload: BackupPayload) => {
    await importBackupData(payload);
    const [nextProducts, nextSales, nextSettings] = await Promise.all([
      getAllProducts(),
      getAllSales(),
      getSettings(),
    ]);
    setProducts(nextProducts);
    setSales(nextSales);
    setSettings(nextSettings);
    setActivePrintSale(nextSales[0] ?? null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="font-editorial text-2xl font-semibold text-[#1E293B]">
            Opening Offline Register...
          </div>
          <p className="text-sm text-slate-500">Loading local IndexedDB inventory and sales ledger.</p>
        </div>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-md bg-white border border-rose-300 rounded-lg p-6 text-center space-y-3">
          <h1 className="font-editorial text-2xl font-semibold text-rose-900">
            Local Database Unavailable
          </h1>
          <p className="text-sm text-slate-600">{dbError}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div id="pos-app-shell" className="min-h-screen bg-[#F8FAFC] text-[#1E293B] flex flex-col">
        <TopBar
          shopName={settings.shopName}
          activeTab={activeTab}
          isAdminUnlocked={isAdminUnlocked}
          hasLastSale={sales.length > 0}
          onSelectTab={handleSelectTab}
          onLockAdmin={() => {
            setIsAdminUnlocked(false);
            setActiveTab('pos');
          }}
          onReprintLast={() => {
            if (sales.length > 0) {
              setPreviewSale(sales[0]);
            }
          }}
        />

        <main className="flex-1">
          {activeTab === 'pos' ? (
            <PosTerminal
              products={products}
              settings={settings}
              onCompleteSale={handleCompleteSale}
            />
          ) : (
            <AdminDashboard
              products={products}
              sales={sales}
              settings={settings}
              onSaveProduct={handleSaveProduct}
              onDeleteProduct={handleDeleteProduct}
              onSaveSettings={handleSaveSettings}
              onReprintSale={triggerThermalPrint}
              onPreviewSale={(sale) => setPreviewSale(sale)}
              onExportBackup={exportBackupData}
              onImportBackup={handleImportBackup}
            />
          )}
        </main>
      </div>

      {/* PIN Lock Modal */}
      <PinGateModal
        isOpen={showPinModal}
        expectedPin={settings.adminPin || '7894'}
        onSuccess={() => {
          setShowPinModal(false);
          setIsAdminUnlocked(true);
          setActiveTab('admin');
        }}
        onCancel={() => setShowPinModal(false)}
      />

      {/* On-Screen Thermal Receipt Preview Modal */}
      <ReceiptPreviewModal
        sale={previewSale}
        settings={settings}
        onClose={() => setPreviewSale(null)}
        onPrint={() => {
          if (previewSale) {
            triggerThermalPrint(previewSale);
          }
        }}
      />

      {/* Dedicated Hidden Print-Only Receipt Area (80mm / 58mm) */}
      <ThermalReceiptPrintArea sale={activePrintSale} settings={settings} />
    </>
  );
}
