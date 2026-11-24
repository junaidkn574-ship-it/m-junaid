export type ProductCategory = 'Gents Cloth' | 'Finger Rings' | 'Accessories';

export type ProductUnit = 'Meter' | 'Suit' | 'Piece';

export type PaymentMode = 'Cash' | 'EasyPaisa' | 'Bank';

export type ReceiptWidth = '80mm' | '58mm';

export interface Product {
  id: string;
  code: string;
  name: string;
  category: ProductCategory;
  unit: ProductUnit;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  size?: string;
  imageDataUrl: string;
  updatedAt: number;
}

export interface CartItem {
  productId: string;
  code: string;
  name: string;
  category: ProductCategory;
  unit: ProductUnit;
  costPrice: number;
  sellingPrice: number;
  qty: number;
  maxStock: number;
  size?: string;
}

export interface SaleItem {
  productId: string;
  code: string;
  name: string;
  unit: ProductUnit;
  size?: string;
  qty: number;
  costPrice: number;
  sellingPrice: number;
  lineTotal: number;
  lineProfit: number;
}

export interface SaleRecord {
  id: string;
  billNumber: number;
  timestamp: number;
  dateKey: string; // YYYY-MM-DD in local time
  monthKey: string; // YYYY-MM in local time
  items: SaleItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  netProfit: number;
  paymentMode: PaymentMode;
}

export interface ShopSettings {
  id: 'shop_settings';
  shopName: string;
  address: string;
  phone: string;
  currencySymbol: string;
  receiptWidth: ReceiptWidth;
  receiptFooter: string;
  ownerName?: string;
  ownerContact?: string;
  adminPin: string;
  pinMigrated?: boolean;
  brandVersion?: number;
  catalogVersion?: number;
  nextBillNumber: number;
}

export interface BackupPayload {
  app: 'SovereignAtelierPOS';
  schemaVersion: number;
  exportedAt: string;
  products: Product[];
  sales: SaleRecord[];
  settings: ShopSettings;
}
