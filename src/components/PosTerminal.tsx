import { useMemo, useState } from 'react';
import {
  Banknote,
  Building2,
  CheckCircle2,
  Minus,
  Plus,
  Printer,
  Search,
  ShoppingBag,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import type { CartItem, PaymentMode, Product, ProductCategory, ShopSettings } from '../types/pos';
import { formatMoney, formatQty, roundQty } from '../utils/formatters';
import { ProductImage } from './ProductImage';

interface PosTerminalProps {
  products: Product[];
  settings: ShopSettings;
  onCompleteSale: (
    cartItems: CartItem[],
    discount: number,
    paymentMode: PaymentMode
  ) => Promise<void>;
}

const CATEGORIES: Array<{ id: 'All' | ProductCategory; label: string }> = [
  { id: 'All', label: 'All Items' },
  { id: 'Gents Cloth', label: 'Gents Cloth' },
  { id: 'Finger Rings', label: 'Finger Rings' },
  { id: 'Accessories', label: 'Accessories' },
];

const PAYMENT_MODES: Array<{ id: PaymentMode; label: string; icon: typeof Banknote }> = [
  { id: 'Cash', label: 'Cash', icon: Banknote },
  { id: 'EasyPaisa', label: 'EasyPaisa', icon: Smartphone },
  { id: 'Bank', label: 'Bank', icon: Building2 },
];

const CLOTH_METER_PRESETS = [1.5, 2.5, 4, 4.5];

export function PosTerminal({ products, settings, onCompleteSale }: PosTerminalProps) {
  const [selectedCategory, setSelectedCategory] = useState<'All' | ProductCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountText, setDiscountText] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [lastTappedId, setLastTappedId] = useState<string | null>(null);

  const cur = settings.currencySymbol || 'Rs.';

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const catMatch = selectedCategory === 'All' || p.category === selectedCategory;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.size ? p.size.toLowerCase().includes(q) : false)
      );
    });
  }, [products, selectedCategory, searchQuery]);

  const cartById = useMemo(() => {
    const map = new Map<string, CartItem>();
    for (const item of cart) {
      map.set(item.productId, item);
    }
    return map;
  }, [cart]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.sellingPrice * item.qty, 0);
  }, [cart]);

  const rawDiscount = parseFloat(discountText);
  const discount = Number.isFinite(rawDiscount) && rawDiscount > 0 ? Math.min(subtotal, rawDiscount) : 0;
  const grandTotal = Math.max(0, subtotal - discount);

  const showNotice = (type: 'error' | 'success', message: string) => {
    setFeedback({ type, message });
    window.setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  };

  const handleAddProduct = (product: Product) => {
    if (product.stock <= 0) {
      showNotice('error', `"${product.name}" is currently out of stock.`);
      return;
    }

    setLastTappedId(product.id);
    window.setTimeout(() => setLastTappedId((prev) => (prev === product.id ? null : prev)), 180);

    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      const step = product.unit === 'Meter' ? 1 : 1;

      if (existing) {
        const nextQty = roundQty(existing.qty + step);
        if (nextQty > product.stock + 0.0001) {
          showNotice('error', `Only ${formatQty(product.stock, product.unit)} available in stock.`);
          return prev;
        }
        return prev.map((c) =>
          c.productId === product.id ? { ...c, qty: nextQty, maxStock: product.stock } : c
        );
      }

      const initialQty = Math.min(step, product.stock);
      return [
        ...prev,
        {
          productId: product.id,
          code: product.code,
          name: product.name,
          category: product.category,
          unit: product.unit,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
          qty: roundQty(initialQty),
          maxStock: product.stock,
          size: product.size,
        },
      ];
    });
  };

  const updateCartQty = (productId: string, nextQtyRaw: number) => {
    const product = products.find((p) => p.id === productId);
    const maxStock = product ? product.stock : 99999;

    if (!Number.isFinite(nextQtyRaw) || nextQtyRaw <= 0) {
      setCart((prev) => prev.filter((item) => item.productId !== productId));
      return;
    }

    const clamped = roundQty(Math.min(nextQtyRaw, maxStock));
    if (nextQtyRaw > maxStock + 0.0001) {
      showNotice('error', `Stock limit reached (${formatQty(maxStock, product?.unit)} max).`);
    }

    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, qty: clamped } : item))
    );
  };

  const handleStepQty = (item: CartItem, deltaSign: 1 | -1) => {
    const step = item.unit === 'Meter' ? 0.5 : 1;
    const nextQty = roundQty(item.qty + deltaSign * step);
    if (nextQty <= 0) {
      setCart((prev) => prev.filter((c) => c.productId !== item.productId));
      return;
    }
    updateCartQty(item.productId, nextQty);
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscountText('');
    setPaymentMode('Cash');
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || isProcessing) return;
    setIsProcessing(true);
    try {
      await onCompleteSale(cart, discount, paymentMode);
      setCart([]);
      setDiscountText('');
      setPaymentMode('Cash');
      showNotice('success', 'Bill saved, stock deducted, and sent to printer.');
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Unable to complete sale.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 sm:py-5">
      {/* Feedback banner */}
      {feedback && (
        <div
          role="status"
          className={`mb-4 px-4 py-3 rounded border text-sm font-semibold flex items-center justify-between gap-3 ${
            feedback.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-black/5 cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT AREA: Search, Categories & Product Catalog (60% -> 7 cols on 12-col grid) */}
        <section className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Search & Category Controls */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 sm:p-4 space-y-3.5">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by cloth name, ring style, or SKU code..."
                aria-label="Search products by name or code"
                className="w-full min-h-[52px] pl-11 pr-11 rounded bg-[#F8FAFC] border border-slate-300 text-[#1E293B] placeholder:text-slate-400 text-base font-medium focus:outline-none focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded text-slate-500 hover:bg-slate-200 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Product categories">
              {CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`min-h-[50px] px-4 sm:px-5 rounded text-sm font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#1E293B] text-[#F59E0B] border border-[#1E293B]'
                        : 'bg-[#F8FAFC] text-[#1E293B] border border-slate-300 hover:border-[#D97706]'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
              <p className="font-editorial text-2xl text-[#1E293B]">No matching products found</p>
              <p className="text-sm text-slate-500 mt-1">
                Try clearing the search query or switching categories, or add new items in Admin &rarr; Inventory.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredProducts.map((product) => {
                const inCart = cartById.get(product.id);
                const outOfStock = product.stock <= 0;
                const lowStock = !outOfStock && product.stock <= (product.unit === 'Meter' ? 5 : 3);
                const isFlashing = lastTappedId === product.id;

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleAddProduct(product)}
                    disabled={outOfStock}
                    className={`group text-left bg-white rounded-lg border overflow-hidden transition-all duration-150 flex flex-col cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${
                      isFlashing
                        ? 'border-[#D97706] ring-2 ring-[#D97706]/30'
                        : inCart
                        ? 'border-[#D97706] shadow-sm'
                        : 'border-slate-200 hover:border-[#D97706]'
                    }`}
                  >
                    <div className="relative aspect-[4/3] w-full bg-[#1E293B] overflow-hidden">
                      <ProductImage
                        src={product.imageDataUrl}
                        alt={product.name}
                        category={product.category}
                        className="w-full h-full group-hover:scale-[1.03] transition-transform duration-200"
                      />
                      {inCart && (
                        <div className="absolute top-2 right-2 px-2.5 py-1 rounded bg-[#D97706] text-[#0F172A] text-xs font-extrabold font-tabular shadow">
                          {formatQty(inCart.qty, product.unit)} in cart
                        </div>
                      )}
                    </div>

                    <div className="p-3 flex-1 flex flex-col justify-between gap-2 w-full">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-500 tracking-wide uppercase truncate">
                          {product.code} · {product.unit}
                          {product.size ? ` · Size ${product.size}` : ''}
                        </div>
                        <h3 className="text-sm font-bold text-[#1E293B] leading-snug mt-0.5 line-clamp-2">
                          {product.name}
                        </h3>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between gap-2 w-full">
                        <span className="text-base font-extrabold font-tabular text-[#1E293B]">
                          {formatMoney(product.sellingPrice, cur)}
                        </span>
                        <span
                          className={`text-xs font-semibold font-tabular whitespace-nowrap ${
                            outOfStock
                              ? 'text-rose-700'
                              : lowStock
                              ? 'text-[#B45309]'
                              : 'text-slate-500'
                          }`}
                        >
                          {outOfStock
                            ? 'Out of stock'
                            : lowStock
                            ? `Low: ${formatQty(product.stock, product.unit)}`
                            : `${formatQty(product.stock, product.unit)}`}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* RIGHT AREA: The Active Docket / Cart (40% -> 5 cols on 12-col grid) */}
        <aside className="lg:col-span-5 xl:col-span-4 bg-[#1E293B] text-[#F8FAFC] rounded-lg border border-[#334155] flex flex-col lg:sticky lg:top-4 overflow-hidden">
          <div className="px-5 py-4 border-b border-[#334155] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-[#F59E0B]" />
              <div>
                <h2 className="font-editorial text-xl font-semibold leading-none">Active Docket</h2>
                <p className="text-xs text-slate-400 mt-1 font-tabular">
                  Next Bill #{settings.nextBillNumber} · {cart.length} {cart.length === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="min-h-[40px] px-3 rounded bg-[#334155] hover:bg-slate-600 text-xs font-semibold text-slate-200 cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="p-4 space-y-3 max-h-[380px] lg:max-h-[42vh] overflow-y-auto divide-y divide-[#334155]/70">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <p className="font-editorial text-xl text-slate-200">Docket is empty</p>
                <p className="text-xs mt-1.5 max-w-[240px] mx-auto leading-relaxed">
                  Tap any cloth, ring, or accessory tile on the left to begin billing.
                </p>
              </div>
            ) : (
              cart.map((item) => {
                const lineTotal = Math.round(item.sellingPrice * item.qty * 100) / 100;
                const isMeter = item.unit === 'Meter';

                return (
                  <div key={item.productId} className="pt-3 first:pt-0 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#F8FAFC] leading-snug truncate">
                          {item.name}
                          {item.size ? ` (Size ${item.size})` : ''}
                        </div>
                        <div className="text-xs text-slate-400 font-tabular mt-0.5">
                          {formatMoney(item.sellingPrice, cur)} / {item.unit} · Max {formatQty(item.maxStock, item.unit)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.productId)}
                        className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded text-slate-400 hover:text-rose-400 hover:bg-[#334155] shrink-0 cursor-pointer"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quantity stepper & direct decimal input */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStepQty(item, -1)}
                          className="min-w-[44px] min-h-[44px] rounded bg-[#334155] hover:bg-slate-600 flex items-center justify-center text-[#F8FAFC] active:scale-95 cursor-pointer"
                          aria-label={`Decrease quantity for ${item.name}`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>

                        <div className="relative flex items-center">
                          <input
                            type="number"
                            step={isMeter ? '0.1' : '1'}
                            min="0.1"
                            max={item.maxStock}
                            value={item.qty}
                            onChange={(e) => {
                              const parsed = parseFloat(e.target.value);
                              if (!Number.isNaN(parsed)) {
                                updateCartQty(item.productId, parsed);
                              }
                            }}
                            aria-label={`Quantity in ${item.unit} for ${item.name}`}
                            className="w-[82px] min-h-[44px] px-2 text-center rounded bg-[#0F172A] border border-[#334155] text-[#F8FAFC] font-bold font-tabular text-sm focus:outline-none focus:border-[#D97706]"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleStepQty(item, 1)}
                          className="min-w-[44px] min-h-[44px] rounded bg-[#334155] hover:bg-slate-600 flex items-center justify-center text-[#F8FAFC] active:scale-95 cursor-pointer"
                          aria-label={`Increase quantity for ${item.name}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-right font-tabular">
                        <div className="text-base font-extrabold text-[#F59E0B]">
                          {formatMoney(lineTotal, cur)}
                        </div>
                      </div>
                    </div>

                    {/* Quick decimal presets for unstitched cloth (Meters) */}
                    {isMeter && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {CLOTH_METER_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            disabled={preset > item.maxStock}
                            onClick={() => updateCartQty(item.productId, preset)}
                            className={`px-2.5 py-1.5 rounded text-xs font-bold font-tabular transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                              Math.abs(item.qty - preset) < 0.01
                                ? 'bg-[#D97706] text-[#0F172A]'
                                : 'bg-[#0F172A] text-slate-300 border border-[#334155] hover:border-[#D97706]'
                            }`}
                          >
                            {preset}m
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Discount, Payment Mode & Checkout Ledger */}
          <div className="p-4 bg-[#0F172A]/60 border-t border-[#334155] space-y-4">
            {/* Discount row */}
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="pos-discount-input" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Discount ({cur})
              </label>
              <input
                id="pos-discount-input"
                type="number"
                min="0"
                step="10"
                value={discountText}
                onChange={(e) => setDiscountText(e.target.value)}
                placeholder="0"
                className="w-36 min-h-[44px] px-3 text-right rounded bg-[#0F172A] border border-[#334155] text-[#F8FAFC] font-bold font-tabular text-sm focus:outline-none focus:border-[#D97706]"
              />
            </div>

            {/* Payment Mode Touch Selector (min-height: 50px) */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Payment Mode
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_MODES.map((mode) => {
                  const Icon = mode.icon;
                  const active = paymentMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setPaymentMode(mode.id)}
                      className={`min-h-[50px] px-2 rounded text-xs font-bold flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#D97706]/20 border-[#D97706] text-[#F59E0B]'
                          : 'bg-[#1E293B] border-[#334155] text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Order Totals */}
            <div className="pt-3 border-t border-[#334155] space-y-1.5 font-tabular">
              <div className="flex justify-between text-sm text-slate-300">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal, cur)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-rose-300">
                  <span>Discount</span>
                  <span>-{formatMoney(discount, cur)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-[#334155]">
                <span className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Grand Total
                </span>
                <span className="text-3xl font-extrabold text-[#F59E0B]">
                  {formatMoney(grandTotal, cur)}
                </span>
              </div>
            </div>

            {/* Primary Checkout & Print CTA (min-height: 54px) */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={cart.length === 0 || isProcessing}
              className="w-full min-h-[56px] px-5 rounded bg-[#D97706] hover:bg-[#B45309] disabled:bg-[#334155] disabled:text-slate-400 text-[#0F172A] font-extrabold text-base tracking-wide uppercase flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
            >
              <Printer className="w-5 h-5" />
              <span>{isProcessing ? 'Saving Bill...' : 'Complete & Print'}</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
