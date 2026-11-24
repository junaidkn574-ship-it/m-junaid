import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Download,
  Edit3,
  Eye,
  MoreVertical,
  PackagePlus,
  Printer,
  Search,
  Settings,
  Trash2,
  Upload,
} from 'lucide-react';
import type {
  BackupPayload,
  Product,
  ProductCategory,
  ReceiptWidth,
  SaleRecord,
  ShopSettings,
} from '../types/pos';
import {
  formatMoney,
  formatQty,
  formatReceiptDateTime,
  getLocalDateKey,
  getLocalMonthKey,
  getYesterdayDateKey,
} from '../utils/formatters';
import { validateBackupPayload } from '../db/indexedDb';
import { ProductImage } from './ProductImage';
import { ProductFormModal } from './ProductFormModal';

type AdminSubTab = 'analytics' | 'inventory' | 'settings';
type DateFilterMode = 'today' | 'yesterday' | 'custom';

interface AdminDashboardProps {
  products: Product[];
  sales: SaleRecord[];
  settings: ShopSettings;
  onSaveProduct: (product: Product) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onSaveSettings: (settings: ShopSettings) => Promise<void>;
  onReprintSale: (sale: SaleRecord) => void;
  onPreviewSale: (sale: SaleRecord) => void;
  onExportBackup: () => Promise<BackupPayload>;
  onImportBackup: (payload: BackupPayload) => Promise<void>;
}

export function AdminDashboard({
  products,
  sales,
  settings,
  onSaveProduct,
  onDeleteProduct,
  onSaveSettings,
  onReprintSale,
  onPreviewSale,
  onExportBackup,
  onImportBackup,
}: AdminDashboardProps) {
  const [subTab, setSubTab] = useState<AdminSubTab>('analytics');

  // Analytics & Sales filters
  const [dateFilter, setDateFilter] = useState<DateFilterMode>('today');
  const [customDate, setCustomDate] = useState<string>(() => getLocalDateKey());
  const [billSearch, setBillSearch] = useState('');

  // Inventory filters & modals
  const [invSearch, setInvSearch] = useState('');
  const [invCategory, setInvCategory] = useState<'All' | ProductCategory>('All');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<Product | null>(null);
  const [actionMenu, setActionMenu] = useState<
    | { kind: 'product'; product: Product; top: number; right: number; openUpward: boolean }
    | { kind: 'sale'; sale: SaleRecord; top: number; right: number; openUpward: boolean }
    | null
  >(null);

  useEffect(() => {
    if (!actionMenu) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-action-menu-root]')) return;
      setActionMenu(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActionMenu(null);
    };
    const handleScroll = () => setActionMenu(null);

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [actionMenu]);

  // Settings form state
  const [shopName, setShopName] = useState(settings.shopName);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);
  const [receiptWidth, setReceiptWidth] = useState<ReceiptWidth>(settings.receiptWidth);
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter);
  const [ownerName, setOwnerName] = useState(settings.ownerName ?? 'Jibran Asad');
  const [ownerContact, setOwnerContact] = useState(settings.ownerContact ?? '03489248868');
  const [newPin, setNewPin] = useState(settings.adminPin);
  const [settingsFeedback, setSettingsFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Backup restore confirmation
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingRestore, setPendingRestore] = useState<BackupPayload | null>(null);
  const [backupNotice, setBackupNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const cur = settings.currencySymbol || 'Rs.';
  const todayKey = getLocalDateKey();
  const yesterdayKey = getYesterdayDateKey();
  const currentMonthKey = getLocalMonthKey();

  // Live KPI metrics using exact formula: (Selling Price - Cost Price) * Qty - Discount
  const kpi = useMemo(() => {
    let todayRevenue = 0;
    let todayNetProfit = 0;
    let todayBills = 0;
    let monthlyProfit = 0;
    let cashToday = 0;
    let digitalToday = 0;

    for (const sale of sales) {
      const calcSaleNetProfit =
        sale.items.reduce(
          (acc, it) => acc + (it.sellingPrice - it.costPrice) * it.qty,
          0
        ) - sale.discount;

      if (sale.dateKey === todayKey) {
        todayRevenue += sale.grandTotal;
        todayNetProfit += calcSaleNetProfit;
        todayBills += 1;
        if (sale.paymentMode === 'Cash') {
          cashToday += sale.grandTotal;
        } else {
          digitalToday += sale.grandTotal;
        }
      }

      if (sale.monthKey === currentMonthKey) {
        monthlyProfit += calcSaleNetProfit;
      }
    }

    const todayMarginPct = todayRevenue > 0 ? Math.round((todayNetProfit / todayRevenue) * 1000) / 10 : 0;

    return {
      todayRevenue,
      todayNetProfit,
      todayBills,
      monthlyProfit,
      todayMarginPct,
      cashToday,
      digitalToday,
    };
  }, [sales, todayKey, currentMonthKey]);

  const targetDateKey =
    dateFilter === 'today' ? todayKey : dateFilter === 'yesterday' ? yesterdayKey : customDate;

  const filteredSales = useMemo(() => {
    const q = billSearch.trim().toLowerCase();
    return sales.filter((s) => {
      if (s.dateKey !== targetDateKey) return false;
      if (!q) return true;
      const matchesBill = String(s.billNumber).includes(q);
      const matchesItem = s.items.some((it) => it.name.toLowerCase().includes(q));
      return matchesBill || matchesItem;
    });
  }, [sales, targetDateKey, billSearch]);

  const filteredInventory = useMemo(() => {
    const q = invSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (invCategory !== 'All' && p.category !== invCategory) return false;
      if (lowStockOnly && p.stock > (p.unit === 'Meter' ? 5 : 3)) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    });
  }, [products, invCategory, lowStockOnly, invSearch]);

  const handleSaveSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedPin = newPin.trim();
    if (!/^\d{4}$/.test(cleanedPin)) {
      setSettingsFeedback({ type: 'err', text: 'Admin PIN must be exactly 4 digits.' });
      return;
    }
    if (!shopName.trim()) {
      setSettingsFeedback({ type: 'err', text: 'Shop name cannot be empty.' });
      return;
    }

    try {
      await onSaveSettings({
        ...settings,
        shopName: shopName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        currencySymbol: currencySymbol.trim() || 'Rs.',
        receiptWidth,
        receiptFooter: receiptFooter.trim(),
        ownerName: ownerName.trim(),
        ownerContact: ownerContact.trim(),
        adminPin: cleanedPin,
        pinMigrated: true,
        brandVersion: 2,
        catalogVersion: 3,
      });
      setSettingsFeedback({ type: 'ok', text: 'Shop settings and PIN saved locally to IndexedDB.' });
    } catch (err) {
      setSettingsFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to save settings.',
      });
    }
  };

  const handleExportJson = async () => {
    setBackupNotice(null);
    try {
      const payload = await onExportBackup();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atelier-pos-backup-${getLocalDateKey()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupNotice({
        type: 'ok',
        text: `Exported ${payload.products.length} products and ${payload.sales.length} bills to JSON file.`,
      });
    } catch (err) {
      setBackupNotice({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to export backup.',
      });
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBackupNotice(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const validated = validateBackupPayload(parsed);
      setPendingRestore(validated);
    } catch (err) {
      setBackupNotice({
        type: 'err',
        text: err instanceof Error ? err.message : 'Invalid backup JSON file.',
      });
    }
  };

  const confirmRestoreBackup = async () => {
    if (!pendingRestore) return;
    try {
      await onImportBackup(pendingRestore);
      setShopName(pendingRestore.settings.shopName);
      setAddress(pendingRestore.settings.address);
      setPhone(pendingRestore.settings.phone);
      setCurrencySymbol(pendingRestore.settings.currencySymbol);
      setReceiptWidth(pendingRestore.settings.receiptWidth);
      setReceiptFooter(pendingRestore.settings.receiptFooter);
      setOwnerName(pendingRestore.settings.ownerName ?? 'Jibran Asad');
      setOwnerContact(pendingRestore.settings.ownerContact ?? '03489248868');
      setNewPin(pendingRestore.settings.adminPin);
      setBackupNotice({
        type: 'ok',
        text: `Restored ${pendingRestore.products.length} products and ${pendingRestore.sales.length} sales records.`,
      });
      setPendingRestore(null);
    } catch (err) {
      setBackupNotice({
        type: 'err',
        text: err instanceof Error ? err.message : 'Restore failed.',
      });
      setPendingRestore(null);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      {/* Admin Sub-Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-editorial text-3xl font-semibold text-[#1E293B]">
            Owner Back-Office
          </h1>
          <p className="text-sm text-slate-500">
            Daily profit analytics, inventory cost controls, thermal receipt settings, and offline USB backups.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Admin sections">
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'analytics'}
            onClick={() => setSubTab('analytics')}
            className={`min-h-[50px] px-5 rounded text-sm font-bold whitespace-nowrap transition-colors cursor-pointer ${
              subTab === 'analytics'
                ? 'bg-[#1E293B] text-[#F59E0B]'
                : 'bg-white text-[#1E293B] border border-slate-300 hover:border-[#D97706]'
            }`}
          >
            Profit &amp; Sales
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'inventory'}
            onClick={() => setSubTab('inventory')}
            className={`min-h-[50px] px-5 rounded text-sm font-bold whitespace-nowrap transition-colors cursor-pointer ${
              subTab === 'inventory'
                ? 'bg-[#1E293B] text-[#F59E0B]'
                : 'bg-white text-[#1E293B] border border-slate-300 hover:border-[#D97706]'
            }`}
          >
            Inventory ({products.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'settings'}
            onClick={() => setSubTab('settings')}
            className={`min-h-[50px] px-5 rounded text-sm font-bold whitespace-nowrap transition-colors cursor-pointer ${
              subTab === 'settings'
                ? 'bg-[#1E293B] text-[#F59E0B]'
                : 'bg-white text-[#1E293B] border border-slate-300 hover:border-[#D97706]'
            }`}
          >
            Backup &amp; Settings
          </button>
        </div>
      </div>

      {/* TAB 1: PROFIT & SALES ANALYTICS */}
      {subTab === 'analytics' && (
        <div className="space-y-6">
          {/* 4-Column KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Today&apos;s Revenue
              </div>
              <div className="mt-2 text-3xl font-extrabold font-tabular text-[#1E293B]">
                {formatMoney(kpi.todayRevenue, cur)}
              </div>
              <div className="mt-2 text-xs text-slate-500 font-tabular">
                Cash: {formatMoney(kpi.cashToday, cur)} · Digital: {formatMoney(kpi.digitalToday, cur)}
              </div>
            </div>

            <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-5 text-[#F8FAFC]">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Today&apos;s Net Profit
              </div>
              <div className="mt-2 text-3xl font-extrabold font-tabular text-[#F59E0B]">
                {formatMoney(kpi.todayNetProfit, cur)}
              </div>
              <div className="mt-2 text-xs text-slate-300 font-tabular">
                Margin: {kpi.todayMarginPct}% after discounts
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Monthly Profit
              </div>
              <div className="mt-2 text-3xl font-extrabold font-tabular text-[#1E293B]">
                {formatMoney(kpi.monthlyProfit, cur)}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Calendar month ({currentMonthKey})
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Bills Today
              </div>
              <div className="mt-2 text-3xl font-extrabold font-tabular text-[#1E293B]">
                {kpi.todayBills}
              </div>
              <div className="mt-2 text-xs text-slate-500 font-tabular">
                Next bill #{settings.nextBillNumber}
              </div>
            </div>
          </div>

          {/* Sales History Filter & Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDateFilter('today')}
                  className={`min-h-[48px] px-4 rounded text-sm font-bold cursor-pointer ${
                    dateFilter === 'today'
                      ? 'bg-[#1E293B] text-[#F59E0B]'
                      : 'bg-[#F8FAFC] text-[#1E293B] border border-slate-300 hover:border-[#D97706]'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter('yesterday')}
                  className={`min-h-[48px] px-4 rounded text-sm font-bold cursor-pointer ${
                    dateFilter === 'yesterday'
                      ? 'bg-[#1E293B] text-[#F59E0B]'
                      : 'bg-[#F8FAFC] text-[#1E293B] border border-slate-300 hover:border-[#D97706]'
                  }`}
                >
                  Yesterday
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDateFilter('custom')}
                    className={`min-h-[48px] px-4 rounded text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                      dateFilter === 'custom'
                        ? 'bg-[#1E293B] text-[#F59E0B]'
                        : 'bg-[#F8FAFC] text-[#1E293B] border border-slate-300 hover:border-[#D97706]'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Custom Date</span>
                  </button>
                  {dateFilter === 'custom' && (
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      aria-label="Choose custom sales date"
                      className="min-h-[48px] px-3 rounded bg-[#F8FAFC] border border-slate-300 text-sm font-semibold text-[#1E293B] focus:outline-none focus:border-[#D97706]"
                    />
                  )}
                </div>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={billSearch}
                  onChange={(e) => setBillSearch(e.target.value)}
                  placeholder="Search Bill # or item..."
                  aria-label="Filter bills by number or item name"
                  className="w-full min-h-[48px] pl-10 pr-3 rounded bg-[#F8FAFC] border border-slate-300 text-sm font-medium text-[#1E293B] focus:outline-none focus:border-[#D97706]"
                />
              </div>
            </div>

            {filteredSales.length === 0 ? (
              <div className="p-12 text-center">
                <p className="font-editorial text-2xl text-[#1E293B]">
                  No bills recorded for {targetDateKey}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Complete a checkout on the POS Billing screen or select another date above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">Bill #</th>
                      <th className="py-3.5 px-4">Date &amp; Time</th>
                      <th className="py-3.5 px-4">Items Sold</th>
                      <th className="py-3.5 px-4">Payment</th>
                      <th className="py-3.5 px-4 text-right">Discount</th>
                      <th className="py-3.5 px-4 text-right">Total</th>
                      <th className="py-3.5 px-4 text-right">Net Profit</th>
                      <th className="py-3.5 px-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {filteredSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-[#F8FAFC]/80">
                        <td className="py-3.5 px-4 font-bold font-tabular text-[#1E293B]">
                          #{sale.billNumber}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-tabular whitespace-nowrap">
                          {formatReceiptDateTime(sale.timestamp)}
                        </td>
                        <td className="py-3.5 px-4 text-[#1E293B] max-w-xs">
                          <div className="truncate font-medium">
                            {sale.items.map((it) => `${it.name} (${formatQty(it.qty, it.unit)})`).join(', ')}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-semibold">
                          {sale.paymentMode}
                        </td>
                        <td className="py-3.5 px-4 text-right font-tabular text-slate-500">
                          {sale.discount > 0 ? `-${formatMoney(sale.discount, cur)}` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold font-tabular text-[#1E293B]">
                          {formatMoney(sale.grandTotal, cur)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold font-tabular text-emerald-700">
                          {formatMoney(sale.netProfit, cur)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex justify-end" data-action-menu-root>
                            <button
                              type="button"
                              onClick={(e) => {
                                if (actionMenu?.kind === 'sale' && actionMenu.sale.id === sale.id) {
                                  setActionMenu(null);
                                  return;
                                }
                                const rect = e.currentTarget.getBoundingClientRect();
                                const openUpward = window.innerHeight - rect.bottom < 130;
                                setActionMenu({
                                  kind: 'sale',
                                  sale,
                                  top: openUpward ? rect.top - 6 : rect.bottom + 6,
                                  right: Math.max(12, window.innerWidth - rect.right),
                                  openUpward,
                                });
                              }}
                              aria-haspopup="menu"
                              aria-expanded={actionMenu?.kind === 'sale' && actionMenu.sale.id === sale.id}
                              aria-label={`Receipt actions for Bill #${sale.billNumber}`}
                              className={`min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded border transition-colors cursor-pointer ${
                                actionMenu?.kind === 'sale' && actionMenu.sale.id === sale.id
                                  ? 'bg-[#1E293B] border-[#1E293B] text-[#F59E0B]'
                                  : 'bg-[#F8FAFC] border-slate-300 hover:border-[#D97706] text-[#1E293B]'
                              }`}
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY MANAGEMENT */}
      {subTab === 'inventory' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                  placeholder="Search inventory..."
                  aria-label="Search inventory products"
                  className="w-full min-h-[50px] pl-10 pr-3 rounded bg-[#F8FAFC] border border-slate-300 text-sm font-medium text-[#1E293B] focus:outline-none focus:border-[#D97706]"
                />
              </div>

              <select
                value={invCategory}
                onChange={(e) => setInvCategory(e.target.value as 'All' | ProductCategory)}
                aria-label="Filter inventory by category"
                className="min-h-[50px] px-3.5 rounded bg-[#F8FAFC] border border-slate-300 text-sm font-semibold text-[#1E293B] focus:outline-none focus:border-[#D97706]"
              >
                <option value="All">All Categories</option>
                <option value="Gents Cloth">Gents Cloth</option>
                <option value="Finger Rings">Finger Rings</option>
                <option value="Accessories">Accessories</option>
              </select>

              <button
                type="button"
                onClick={() => setLowStockOnly((v) => !v)}
                className={`min-h-[50px] px-4 rounded text-sm font-bold border cursor-pointer ${
                  lowStockOnly
                    ? 'bg-[#D97706]/15 border-[#D97706] text-[#B45309]'
                    : 'bg-[#F8FAFC] border-slate-300 text-slate-700 hover:border-[#D97706]'
                }`}
              >
                Low Stock Only
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setProductModalOpen(true);
              }}
              className="min-h-[50px] px-5 rounded bg-[#D97706] hover:bg-[#B45309] text-[#0F172A] text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            {filteredInventory.length === 0 ? (
              <div className="p-12 text-center">
                <p className="font-editorial text-2xl text-[#1E293B]">No inventory items match</p>
                <p className="text-sm text-slate-500 mt-1">
                  Adjust filters or add a new cloth bolt, ring, or accessory.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">Product</th>
                      <th className="py-3.5 px-4">Category · Unit</th>
                      <th className="py-3.5 px-4 text-right">Khareed (Cost)</th>
                      <th className="py-3.5 px-4 text-right">Farokht (Sell)</th>
                      <th className="py-3.5 px-4 text-right">Margin / Unit</th>
                      <th className="py-3.5 px-4 text-right">Stock</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {filteredInventory.map((product) => {
                      const margin = product.sellingPrice - product.costPrice;
                      const isLow = product.stock <= (product.unit === 'Meter' ? 5 : 3);
                      return (
                        <tr key={product.id} className="hover:bg-[#F8FAFC]/80">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-10 rounded overflow-hidden border border-slate-200 bg-[#1E293B] shrink-0">
                                <ProductImage
                                  src={product.imageDataUrl}
                                  alt={product.name}
                                  category={product.category}
                                  className="w-full h-full"
                                />
                              </div>
                              <div>
                                <div className="font-bold text-[#1E293B]">{product.name}</div>
                                <div className="text-xs text-slate-500 font-mono">{product.code}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {product.category} · {product.unit}
                            {product.size ? ` · Size ${product.size}` : ''}
                          </td>
                          <td className="py-3 px-4 text-right font-tabular text-slate-600">
                            {formatMoney(product.costPrice, cur)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold font-tabular text-[#1E293B]">
                            {formatMoney(product.sellingPrice, cur)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold font-tabular text-emerald-700">
                            +{formatMoney(margin, cur)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-bold font-tabular ${
                              product.stock <= 0
                                ? 'text-rose-700'
                                : isLow
                                ? 'text-[#B45309]'
                                : 'text-[#1E293B]'
                            }`}
                          >
                            {formatQty(product.stock, product.unit)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex justify-end" data-action-menu-root>
                              <button
                                type="button"
                                onClick={(e) => {
                                  if (actionMenu?.kind === 'product' && actionMenu.product.id === product.id) {
                                    setActionMenu(null);
                                    return;
                                  }
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const openUpward = window.innerHeight - rect.bottom < 130;
                                  setActionMenu({
                                    kind: 'product',
                                    product,
                                    top: openUpward ? rect.top - 6 : rect.bottom + 6,
                                    right: Math.max(12, window.innerWidth - rect.right),
                                    openUpward,
                                  });
                                }}
                                aria-haspopup="menu"
                                aria-expanded={actionMenu?.kind === 'product' && actionMenu.product.id === product.id}
                                aria-label={`Actions for ${product.name}`}
                                className={`min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded border transition-colors cursor-pointer ${
                                  actionMenu?.kind === 'product' && actionMenu.product.id === product.id
                                    ? 'bg-[#1E293B] border-[#1E293B] text-[#F59E0B]'
                                    : 'bg-[#F8FAFC] border-slate-300 hover:border-[#D97706] text-[#1E293B]'
                                }`}
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BACKUP & SHOP SETTINGS */}
      {subTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Backup & Restore Card (USB Drive) */}
          <section className="lg:col-span-5 bg-[#1E293B] text-[#F8FAFC] border border-[#334155] rounded-lg p-5 sm:p-6 space-y-5">
            <div>
              <h2 className="font-editorial text-2xl font-semibold">Offline Backup &amp; Restore</h2>
              <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                Save a complete JSON snapshot of your products, compressed photos, sales history, and settings to a USB flash drive, or restore from a previous backup file.
              </p>
            </div>

            {backupNotice && (
              <div
                className={`p-3.5 rounded text-sm font-semibold border ${
                  backupNotice.type === 'ok'
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                }`}
              >
                {backupNotice.text}
              </div>
            )}

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleExportJson}
                className="w-full min-h-[54px] px-5 rounded bg-[#D97706] hover:bg-[#B45309] text-[#0F172A] font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>Export Backup to JSON</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelected}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full min-h-[54px] px-5 rounded bg-[#334155] hover:bg-slate-600 text-[#F8FAFC] font-bold text-sm uppercase tracking-wider border border-slate-500 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Upload className="w-5 h-5 text-[#F59E0B]" />
                <span>Import Backup JSON File</span>
              </button>
            </div>

            <div className="pt-4 border-t border-[#334155] text-xs text-slate-400 space-y-1 font-tabular">
              <div>Stored Locally: {products.length} products · {sales.length} bills</div>
              <div>Storage Engine: Browser IndexedDB (100% Offline)</div>
            </div>
          </section>

          {/* Shop Info, Thermal Receipt & Admin PIN Settings */}
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 sm:p-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200 mb-5">
              <Settings className="w-5 h-5 text-[#D97706]" />
              <div>
                <h2 className="font-editorial text-2xl font-semibold text-[#1E293B]">
                  Shop, Receipt &amp; Security Settings
                </h2>
                <p className="text-xs text-slate-500">
                  Details printed on your 80mm / 58mm thermal bills and Admin PIN lock.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSettingsSubmit} className="space-y-4">
              {settingsFeedback && (
                <div
                  className={`p-3.5 rounded text-sm font-semibold border ${
                    settingsFeedback.type === 'ok'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  {settingsFeedback.text}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="set-shop-name" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Shop Name
                  </label>
                  <input
                    id="set-shop-name"
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 rounded bg-[#F8FAFC] border border-slate-300 text-[#1E293B] font-semibold focus:outline-none focus:border-[#D97706]"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="set-phone" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Shop Phone
                  </label>
                  <input
                    id="set-phone"
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 rounded bg-[#F8FAFC] border border-slate-300 text-[#1E293B] font-semibold focus:outline-none focus:border-[#D97706]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="set-address" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Shop Address
                </label>
                <input
                  id="set-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 rounded bg-[#F8FAFC] border border-slate-300 text-[#1E293B] font-medium focus:outline-none focus:border-[#D97706]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="set-currency" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Currency Symbol
                  </label>
                  <input
                    id="set-currency"
                    type="text"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 rounded bg-[#F8FAFC] border border-slate-300 text-[#1E293B] font-bold focus:outline-none focus:border-[#D97706]"
                  />
                </div>

                <div>
                  <label htmlFor="set-width" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Thermal Roll Width
                  </label>
                  <select
                    id="set-width"
                    value={receiptWidth}
                    onChange={(e) => setReceiptWidth(e.target.value as ReceiptWidth)}
                    className="w-full min-h-[48px] px-3.5 rounded bg-[#F8FAFC] border border-slate-300 text-[#1E293B] font-bold focus:outline-none focus:border-[#D97706]"
                  >
                    <option value="80mm">80mm (Standard Thermal)</option>
                    <option value="58mm">58mm (Compact Thermal)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="set-pin" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Admin PIN (4 Digits)
                  </label>
                  <input
                    id="set-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full min-h-[48px] px-3.5 rounded bg-[#F8FAFC] border border-slate-300 text-[#1E293B] font-bold font-tabular tracking-[0.25em] focus:outline-none focus:border-[#D97706]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="set-owner-name" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Receipt Footer Name
                  </label>
                  <input
                    id="set-owner-name"
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Jibran Asad"
                    className="w-full min-h-[48px] px-3.5 rounded bg-[#F8FAFC] border border-slate-300 text-[#1E293B] font-semibold focus:outline-none focus:border-[#D97706]"
                  />
                </div>
                <div>
                  <label htmlFor="set-owner-contact" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Receipt Footer Contact Number
                  </label>
                  <input
                    id="set-owner-contact"
                    type="text"
                    value={ownerContact}
                    onChange={(e) => setOwnerContact(e.target.value)}
                    placeholder="03489248868"
                    className="w-full min-h-[48px] px-3.5 rounded bg-[#F8FAFC] border border-slate-300 text-[#1E293B] font-semibold font-tabular focus:outline-none focus:border-[#D97706]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="set-footer" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Receipt Footer Note
                </label>
                <textarea
                  id="set-footer"
                  rows={2}
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  className="w-full p-3.5 rounded bg-[#F8FAFC] border border-slate-300 text-[#1E293B] text-sm font-medium focus:outline-none focus:border-[#D97706]"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="min-h-[50px] px-6 rounded bg-[#1E293B] hover:bg-[#334155] text-[#F59E0B] text-sm font-bold cursor-pointer"
                >
                  Save Shop Settings
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Product Add/Edit Modal */}
      <ProductFormModal
        isOpen={productModalOpen}
        editingProduct={editingProduct}
        currencySymbol={cur}
        onSave={onSaveProduct}
        onClose={() => {
          setProductModalOpen(false);
          setEditingProduct(null);
        }}
      />

      {/* Delete Product Confirmation Modal */}
      {confirmDeleteProduct && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Delete Product"
        >
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-editorial text-2xl font-semibold text-[#1E293B]">
              Delete Product?
            </h3>
            <p className="text-sm text-slate-600">
              Remove <span className="font-bold text-[#1E293B]">{confirmDeleteProduct.name}</span> ({confirmDeleteProduct.code}) from inventory? Past sales records will stay intact.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteProduct(null)}
                className="min-h-[48px] px-5 rounded border border-slate-300 hover:bg-slate-100 text-sm font-semibold text-[#1E293B] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onDeleteProduct(confirmDeleteProduct.id);
                  setConfirmDeleteProduct(null);
                }}
                className="min-h-[48px] px-5 rounded bg-rose-700 hover:bg-rose-800 text-white text-sm font-bold cursor-pointer"
              >
                Delete Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Backup Confirmation Modal */}
      {pendingRestore && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Backup Restore"
        >
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-editorial text-2xl font-semibold text-[#1E293B]">
              Restore Local Backup?
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              This will replace your current browser inventory and sales history with the selected backup:
            </p>
            <div className="p-3.5 rounded bg-[#F8FAFC] border border-slate-200 text-xs text-[#1E293B] space-y-1 font-tabular">
              <div>Shop: {pendingRestore.settings.shopName}</div>
              <div>Products to restore: {pendingRestore.products.length}</div>
              <div>Sales bills to restore: {pendingRestore.sales.length}</div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingRestore(null)}
                className="min-h-[48px] px-5 rounded border border-slate-300 hover:bg-slate-100 text-sm font-semibold text-[#1E293B] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRestoreBackup}
                className="min-h-[48px] px-5 rounded bg-[#D97706] hover:bg-[#B45309] text-[#0F172A] text-sm font-bold cursor-pointer"
              >
                Restore Backup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Three-dot Row Actions Menu (Inventory & Sales) */}
      {actionMenu && (
        <div
          data-action-menu-root
          role="menu"
          aria-label={
            actionMenu.kind === 'product'
              ? `Options for ${actionMenu.product.name}`
              : `Options for Bill #${actionMenu.sale.billNumber}`
          }
          style={{
            top: actionMenu.top,
            right: actionMenu.right,
            transform: actionMenu.openUpward ? 'translateY(-100%)' : undefined,
          }}
          className="fixed z-40 w-48 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden py-1"
        >
          {actionMenu.kind === 'product' ? (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const target = actionMenu.product;
                  setActionMenu(null);
                  setEditingProduct(target);
                  setProductModalOpen(true);
                }}
                className="w-full min-h-[46px] px-4 text-left text-sm font-semibold text-[#1E293B] hover:bg-[#F8FAFC] flex items-center gap-2.5 cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-[#D97706]" />
                <span>Edit Item</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const target = actionMenu.product;
                  setActionMenu(null);
                  setConfirmDeleteProduct(target);
                }}
                className="w-full min-h-[46px] px-4 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50 border-t border-slate-100 flex items-center gap-2.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Item</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const target = actionMenu.sale;
                  setActionMenu(null);
                  onPreviewSale(target);
                }}
                className="w-full min-h-[46px] px-4 text-left text-sm font-semibold text-[#1E293B] hover:bg-[#F8FAFC] flex items-center gap-2.5 cursor-pointer"
              >
                <Eye className="w-4 h-4 text-slate-600" />
                <span>View Receipt</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const target = actionMenu.sale;
                  setActionMenu(null);
                  onReprintSale(target);
                }}
                className="w-full min-h-[46px] px-4 text-left text-sm font-semibold text-[#1E293B] hover:bg-[#F8FAFC] border-t border-slate-100 flex items-center gap-2.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#D97706]" />
                <span>Re-print Receipt</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
