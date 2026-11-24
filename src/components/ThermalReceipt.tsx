import { Printer, X } from 'lucide-react';
import type { SaleRecord, ShopSettings } from '../types/pos';
import { formatMoney, formatQty, formatReceiptDateTime } from '../utils/formatters';

interface ThermalReceiptPrintAreaProps {
  sale: SaleRecord | null;
  settings: ShopSettings;
}

export function ThermalReceiptContent({ sale, settings }: { sale: SaleRecord; settings: ShopSettings }) {
  const cur = settings.currencySymbol || 'Rs.';

  return (
    <div className="text-black font-mono text-[11px] leading-[1.35]">
      <div className="text-center pb-2 border-b border-dashed border-black">
        <div className="text-[15px] font-bold uppercase tracking-wide">{settings.shopName}</div>
        {settings.address && <div className="text-[10px] mt-0.5">{settings.address}</div>}
        {settings.phone && <div className="text-[10px]">Tel: {settings.phone}</div>}
      </div>

      <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span>Bill No:</span>
          <span className="font-bold">#{sale.billNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{formatReceiptDateTime(sale.timestamp)}</span>
        </div>
        <div className="flex justify-between">
          <span>Payment:</span>
          <span className="font-bold">{sale.paymentMode}</span>
        </div>
      </div>

      <div className="py-2 border-b border-dashed border-black">
        <div className="flex justify-between font-bold text-[10px] pb-1 border-b border-black/40 mb-1">
          <span>ITEM</span>
          <span>AMOUNT</span>
        </div>
        <div className="space-y-1.5">
          {sale.items.map((item, idx) => (
            <div key={`${item.productId}-${idx}`}>
              <div className="font-semibold break-words">
                {item.name}
                {item.size ? ` (Size ${item.size})` : ''}
              </div>
              <div className="flex justify-between text-[10px] pl-1">
                <span>
                  {formatQty(item.qty, item.unit)} x {formatMoney(item.sellingPrice, cur)}
                </span>
                <span className="font-bold">{formatMoney(item.lineTotal, cur)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="py-2 border-b border-dashed border-black space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatMoney(sale.subtotal, cur)}</span>
        </div>
        {sale.discount > 0 && (
          <div className="flex justify-between">
            <span>Discount</span>
            <span>-{formatMoney(sale.discount, cur)}</span>
          </div>
        )}
        <div className="flex justify-between text-[13px] font-bold pt-1 border-t border-black/40">
          <span>GRAND TOTAL</span>
          <span>{formatMoney(sale.grandTotal, cur)}</span>
        </div>
      </div>

      <div className="pt-2.5 text-center text-[10px]">
        <div className="font-bold uppercase tracking-wider">Thank You</div>
        {settings.receiptFooter && <div className="mt-1 leading-snug">{settings.receiptFooter}</div>}
        {(settings.ownerName || settings.ownerContact) && (
          <div className="mt-2 pt-1.5 border-t border-dashed border-black font-semibold space-y-0.5">
            {settings.ownerName && <div>{settings.ownerName}</div>}
            {settings.ownerContact && <div>Contact: {settings.ownerContact}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hidden on screen; exclusively printed by @media print for 80mm / 58mm thermal printers.
 */
export function ThermalReceiptPrintArea({ sale, settings }: ThermalReceiptPrintAreaProps) {
  const is58 = settings.receiptWidth === '58mm';

  return (
    <div
      id="thermal-receipt-print"
      className={is58 ? 'receipt-58mm' : 'receipt-80mm'}
      aria-hidden="true"
    >
      {sale ? <ThermalReceiptContent sale={sale} settings={settings} /> : null}
    </div>
  );
}

interface ReceiptPreviewModalProps {
  sale: SaleRecord | null;
  settings: ShopSettings;
  onClose: () => void;
  onPrint: () => void;
}

export function ReceiptPreviewModal({ sale, settings, onClose, onPrint }: ReceiptPreviewModalProps) {
  if (!sale) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Receipt #${sale.billNumber}`}
    >
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg max-w-md w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155] text-[#F8FAFC]">
          <div>
            <h3 className="font-editorial text-xl font-semibold">Thermal Receipt Preview</h3>
            <p className="text-xs text-slate-400">
              Bill #{sale.billNumber} · Paper: {settings.receiptWidth}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded bg-[#334155] hover:bg-slate-600 text-slate-200 cursor-pointer"
            aria-label="Close receipt preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 bg-slate-900/50 flex justify-center max-h-[65vh] overflow-y-auto">
          <div
            className={`bg-white text-black p-4 shadow-md border border-slate-300 ${
              settings.receiptWidth === '58mm' ? 'w-[240px]' : 'w-[310px]'
            }`}
          >
            <ThermalReceiptContent sale={sale} settings={settings} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 bg-[#1E293B] border-t border-[#334155]">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[50px] px-5 rounded bg-[#334155] hover:bg-slate-600 text-[#F8FAFC] text-sm font-semibold cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="min-h-[50px] px-6 rounded bg-[#D97706] hover:bg-[#B45309] text-[#0F172A] text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
}
