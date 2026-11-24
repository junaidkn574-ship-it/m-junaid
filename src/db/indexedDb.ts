import type {
  BackupPayload,
  CartItem,
  PaymentMode,
  Product,
  SaleItem,
  SaleRecord,
  ShopSettings,
} from '../types/pos';
import { getLocalDateKey, getLocalMonthKey, roundQty } from '../utils/formatters';

const DB_NAME = 'sovereign_atelier_pos_db';
const DB_VERSION = 1;

const STORE_PRODUCTS = 'products';
const STORE_SALES = 'sales';
const STORE_SETTINGS = 'settings';

export const DEFAULT_SETTINGS: ShopSettings = {
  id: 'shop_settings',
  shopName: 'Nishat Brand',
  address: 'Shop 14, Saddar Cloth & Jewellery Arcade',
  phone: '0300-5550192',
  currencySymbol: 'Rs.',
  receiptWidth: '80mm',
  receiptFooter: 'Thank you for your patronage. Uncut cloth & rings exchangeable within 7 days with bill.',
  ownerName: 'Jibran Asad',
  ownerContact: '03489248868',
  adminPin: '7894',
  pinMigrated: true,
  brandVersion: 2,
  catalogVersion: 3,
  nextBillNumber: 1001,
};

const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod-cloth-001',
    code: 'CL-101',
    name: 'Super 120s Charcoal Worsted Wool',
    category: 'Gents Cloth',
    unit: 'Meter',
    costPrice: 1450,
    sellingPrice: 2100,
    stock: 42.5,
    imageDataUrl: '/src/assets/images/cloth_dark_suiting_1795427982100.jpg',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-cloth-002',
    code: 'CL-102',
    name: 'Royal Navy Tropical Suiting',
    category: 'Gents Cloth',
    unit: 'Meter',
    costPrice: 1100,
    sellingPrice: 1650,
    stock: 56,
    imageDataUrl: '/src/assets/images/cloth_dark_suiting_1795427982100.jpg',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-cloth-003',
    code: 'CL-103',
    name: 'Handwoven Cream Silk Boski (4.5m)',
    category: 'Gents Cloth',
    unit: 'Suit',
    costPrice: 6200,
    sellingPrice: 8800,
    stock: 14,
    imageDataUrl: '/src/assets/images/cloth_ivory_boski_1795427979517.jpg',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-cloth-004',
    code: 'CL-104',
    name: 'Fine Egyptian Cotton 100/2 Ivory',
    category: 'Gents Cloth',
    unit: 'Meter',
    costPrice: 850,
    sellingPrice: 1300,
    stock: 38,
    imageDataUrl: '/src/assets/images/cloth_ivory_boski_1795427979517.jpg',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-ring-001',
    code: 'RG-201',
    name: '925 Silver Yemeni Aqeeq Ring',
    category: 'Finger Rings',
    unit: 'Piece',
    costPrice: 3800,
    sellingPrice: 5500,
    stock: 9,
    imageDataUrl: '/src/assets/images/ring_silver_aqeeq_1795427980529.jpg',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-ring-002',
    code: 'RG-202',
    name: 'Brushed Silver & Gold Black Onyx Signet',
    category: 'Finger Rings',
    unit: 'Piece',
    costPrice: 4400,
    sellingPrice: 6400,
    stock: 7,
    imageDataUrl: '/src/assets/images/ring_onyx_signet_1795427980033.jpg',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-ring-003',
    code: 'RG-203',
    name: 'Turki Engraved Aqeeq Band (Size 10)',
    category: 'Finger Rings',
    unit: 'Piece',
    costPrice: 3200,
    sellingPrice: 4800,
    stock: 4,
    imageDataUrl: '/src/assets/images/ring_silver_aqeeq_1795427980529.jpg',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-acc-001',
    code: 'AC-301',
    name: 'Brushed Gold & Onyx Cufflinks Set',
    category: 'Accessories',
    unit: 'Piece',
    costPrice: 1800,
    sellingPrice: 2900,
    stock: 16,
    imageDataUrl: '/src/assets/images/accessory_cufflinks_gold_1795427980333.jpg',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-cloth-005',
    code: 'CL-105',
    name: 'Moderate Wash & Wear Olive Green',
    category: 'Gents Cloth',
    unit: 'Meter',
    costPrice: 520,
    sellingPrice: 820,
    stock: 64,
    imageDataUrl: '/src/assets/images/cloth_wash_wear_olive_1795513030269.jpg',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-cloth-006',
    code: 'CL-106',
    name: 'Moderate Wash & Wear Slate Grey (4.5m Suit)',
    category: 'Gents Cloth',
    unit: 'Suit',
    costPrice: 2250,
    sellingPrice: 3400,
    stock: 22,
    imageDataUrl: '/src/assets/images/cloth_wash_wear_olive_1795513030269.jpg',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-cloth-007',
    code: 'CL-107',
    name: 'Crisp Snow-White Cotton Latha',
    category: 'Gents Cloth',
    unit: 'Meter',
    costPrice: 640,
    sellingPrice: 980,
    stock: 52,
    imageDataUrl: '/src/assets/images/cloth_white_latha_1795513033642.jpg',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-cloth-008',
    code: 'CL-108',
    name: 'Soft Cream Egyptian Latha (4.5m Suit)',
    category: 'Gents Cloth',
    unit: 'Suit',
    costPrice: 2800,
    sellingPrice: 4100,
    stock: 18,
    imageDataUrl: '/src/assets/images/cloth_white_latha_1795513033642.jpg',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-cloth-009',
    code: 'CL-109',
    name: 'Moderate Winter Karandi Camel',
    category: 'Gents Cloth',
    unit: 'Meter',
    costPrice: 680,
    sellingPrice: 1050,
    stock: 46,
    imageDataUrl: '/src/assets/images/cloth_winter_karandi_1795513032285.jpg',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-cloth-010',
    code: 'CL-110',
    name: 'Espresso Slub Khaddar Winter Suit (4.5m)',
    category: 'Gents Cloth',
    unit: 'Suit',
    costPrice: 2950,
    sellingPrice: 4400,
    stock: 15,
    imageDataUrl: '/src/assets/images/cloth_winter_karandi_1795513032285.jpg',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-ring-004',
    code: 'RG-204',
    name: '925 Silver Nishapuri Feroza Ring',
    category: 'Finger Rings',
    unit: 'Piece',
    costPrice: 3500,
    sellingPrice: 5200,
    stock: 8,
    imageDataUrl: '/src/assets/images/ring_turquoise_feroza_1795513032091.jpg',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-acc-002',
    code: 'AC-302',
    name: 'Full-Grain Espresso Leather Wallet',
    category: 'Accessories',
    unit: 'Piece',
    costPrice: 1450,
    sellingPrice: 2400,
    stock: 14,
    imageDataUrl: '/src/assets/images/accessory_leather_wallet_1795513033515.jpg',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-tayar-001',
    code: 'ST-401',
    name: 'Ready-Made Black Shalwar Kameez',
    category: 'Gents Cloth',
    unit: 'Suit',
    size: 'M',
    costPrice: 3100,
    sellingPrice: 4600,
    stock: 8,
    imageDataUrl: '/src/assets/images/tayar_black_shalwar_kameez_1795513208146.jpg',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-tayar-002',
    code: 'ST-402',
    name: 'Ready-Made Black Shalwar Kameez',
    category: 'Gents Cloth',
    unit: 'Suit',
    size: 'L',
    costPrice: 3100,
    sellingPrice: 4600,
    stock: 10,
    imageDataUrl: '/src/assets/images/tayar_black_shalwar_kameez_1795513208146.jpg',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-tayar-003',
    code: 'ST-403',
    name: 'Ready-Made White Cotton Kurta Shalwar',
    category: 'Gents Cloth',
    unit: 'Suit',
    size: 'M',
    costPrice: 2800,
    sellingPrice: 4200,
    stock: 9,
    imageDataUrl: '/src/assets/images/tayar_white_kurta_pajama_1795513208814.jpg',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-tayar-004',
    code: 'ST-404',
    name: 'Ready-Made White Cotton Kurta Shalwar',
    category: 'Gents Cloth',
    unit: 'Suit',
    size: 'XL',
    costPrice: 2800,
    sellingPrice: 4200,
    stock: 6,
    imageDataUrl: '/src/assets/images/tayar_white_kurta_pajama_1795513208814.jpg',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-tayar-005',
    code: 'ST-405',
    name: 'Ready-Made Royal Navy Bandgala Waistcoat',
    category: 'Gents Cloth',
    unit: 'Piece',
    size: 'L',
    costPrice: 3400,
    sellingPrice: 5200,
    stock: 7,
    imageDataUrl: '/src/assets/images/tayar_navy_waistcoat_1795513209380.jpg',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-tayar-006',
    code: 'ST-406',
    name: 'Ready-Made Charcoal 2-Piece Formal Suit',
    category: 'Gents Cloth',
    unit: 'Suit',
    size: '40 / M',
    costPrice: 9500,
    sellingPrice: 13800,
    stock: 5,
    imageDataUrl: '/src/assets/images/tayar_charcoal_blazer_1795513209381.jpg',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-tayar-007',
    code: 'ST-407',
    name: 'Ready-Made Cream Kurta & Brown Waistcoat',
    category: 'Gents Cloth',
    unit: 'Suit',
    size: 'L',
    costPrice: 4800,
    sellingPrice: 7200,
    stock: 6,
    imageDataUrl: '/src/assets/images/tayar_beige_kurta_waistcoat_1795513210036.jpg',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-tayar-008',
    code: 'ST-408',
    name: 'Ready-Made Cream Kurta & Brown Waistcoat',
    category: 'Gents Cloth',
    unit: 'Suit',
    size: 'S',
    costPrice: 4800,
    sellingPrice: 7200,
    stock: 4,
    imageDataUrl: '/src/assets/images/tayar_beige_kurta_waistcoat_1795513210036.jpg',
    updatedAt: Date.now(),
  },
];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
        const productStore = db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' });
        productStore.createIndex('category', 'category', { unique: false });
        productStore.createIndex('code', 'code', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_SALES)) {
        const salesStore = db.createObjectStore(STORE_SALES, { keyPath: 'id' });
        salesStore.createIndex('dateKey', 'dateKey', { unique: false });
        salesStore.createIndex('timestamp', 'timestamp', { unique: false });
        salesStore.createIndex('billNumber', 'billNumber', { unique: true });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error('Failed to open IndexedDB.'));
    };
  });

  return dbPromise;
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed.'));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed.'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted.'));
  });
}

export async function initializePosDatabase(): Promise<{
  products: Product[];
  sales: SaleRecord[];
  settings: ShopSettings;
}> {
  const db = await openDatabase();

  // Check if settings exist; if first launch, seed defaults and starter catalog
  const readTx = db.transaction([STORE_PRODUCTS, STORE_SALES, STORE_SETTINGS], 'readonly');
  const [existingProducts, existingSales, existingSettings] = await Promise.all([
    idbRequest<Product[]>(readTx.objectStore(STORE_PRODUCTS).getAll()),
    idbRequest<SaleRecord[]>(readTx.objectStore(STORE_SALES).getAll()),
    idbRequest<ShopSettings | undefined>(readTx.objectStore(STORE_SETTINGS).get('shop_settings')),
  ]);
  await txDone(readTx);

  if (!existingSettings && existingProducts.length === 0 && existingSales.length === 0) {
    const seedTx = db.transaction([STORE_PRODUCTS, STORE_SETTINGS], 'readwrite');
    const prodStore = seedTx.objectStore(STORE_PRODUCTS);
    for (const p of SEED_PRODUCTS) {
      prodStore.put(p);
    }
    seedTx.objectStore(STORE_SETTINGS).put(DEFAULT_SETTINGS);
    await txDone(seedTx);

    return {
      products: [...SEED_PRODUCTS].sort((a, b) => a.name.localeCompare(b.name)),
      sales: [],
      settings: { ...DEFAULT_SETTINGS },
    };
  }

  let finalSettings: ShopSettings = existingSettings
    ? { ...DEFAULT_SETTINGS, ...existingSettings }
    : { ...DEFAULT_SETTINGS };

  let needsSave = !existingSettings;
  if (existingSettings && !existingSettings.pinMigrated) {
    finalSettings = {
      ...finalSettings,
      adminPin: existingSettings.adminPin === '1234' ? '7894' : existingSettings.adminPin,
      pinMigrated: true,
    };
    needsSave = true;
  }

  if (existingSettings && (!existingSettings.brandVersion || existingSettings.brandVersion < 2)) {
    const legacyNames = ['Sovereign Atelier', 'Nisha'];
    finalSettings = {
      ...finalSettings,
      shopName: legacyNames.includes(existingSettings.shopName)
        ? 'Nishat Brand'
        : existingSettings.shopName,
      brandVersion: 2,
    };
    needsSave = true;
  }

  let mergedProducts = [...existingProducts];
  if (!existingSettings?.catalogVersion || existingSettings.catalogVersion < 3) {
    const existingIds = new Set(existingProducts.map((p) => p.id));
    const missingSeedItems = SEED_PRODUCTS.filter((p) => !existingIds.has(p.id));
    if (missingSeedItems.length > 0) {
      const catTx = db.transaction(STORE_PRODUCTS, 'readwrite');
      const prodStore = catTx.objectStore(STORE_PRODUCTS);
      for (const item of missingSeedItems) {
        prodStore.put(item);
      }
      await txDone(catTx);
      mergedProducts = [...existingProducts, ...missingSeedItems];
    }
    finalSettings = {
      ...finalSettings,
      catalogVersion: 3,
    };
    needsSave = true;
  }

  if (needsSave) {
    await saveSettings(finalSettings);
  }

  return {
    products: mergedProducts.sort((a, b) => a.name.localeCompare(b.name)),
    sales: existingSales.sort((a, b) => b.timestamp - a.timestamp),
    settings: finalSettings,
  };
}

export async function getAllProducts(): Promise<Product[]> {
  const db = await openDatabase();
  const tx = db.transaction(STORE_PRODUCTS, 'readonly');
  const items = await idbRequest<Product[]>(tx.objectStore(STORE_PRODUCTS).getAll());
  await txDone(tx);
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveProduct(product: Product): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORE_PRODUCTS, 'readwrite');
  tx.objectStore(STORE_PRODUCTS).put({
    ...product,
    stock: roundQty(Math.max(0, product.stock)),
    updatedAt: Date.now(),
  });
  await txDone(tx);
}

export async function deleteProduct(productId: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORE_PRODUCTS, 'readwrite');
  tx.objectStore(STORE_PRODUCTS).delete(productId);
  await txDone(tx);
}

export async function getAllSales(): Promise<SaleRecord[]> {
  const db = await openDatabase();
  const tx = db.transaction(STORE_SALES, 'readonly');
  const items = await idbRequest<SaleRecord[]>(tx.objectStore(STORE_SALES).getAll());
  await txDone(tx);
  return items.sort((a, b) => b.timestamp - a.timestamp);
}

export async function getSettings(): Promise<ShopSettings> {
  const db = await openDatabase();
  const tx = db.transaction(STORE_SETTINGS, 'readonly');
  const existing = await idbRequest<ShopSettings | undefined>(
    tx.objectStore(STORE_SETTINGS).get('shop_settings')
  );
  await txDone(tx);
  return existing ? { ...DEFAULT_SETTINGS, ...existing } : { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings: ShopSettings): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORE_SETTINGS, 'readwrite');
  tx.objectStore(STORE_SETTINGS).put({ ...settings, id: 'shop_settings' });
  await txDone(tx);
}

export async function completeSaleTransaction(
  cartItems: CartItem[],
  discountInput: number,
  paymentMode: PaymentMode
): Promise<{ sale: SaleRecord; updatedProducts: Product[]; updatedSettings: ShopSettings }> {
  if (cartItems.length === 0) {
    throw new Error('Cannot complete an empty bill.');
  }

  const db = await openDatabase();
  const tx = db.transaction([STORE_PRODUCTS, STORE_SALES, STORE_SETTINGS], 'readwrite');
  const productStore = tx.objectStore(STORE_PRODUCTS);
  const salesStore = tx.objectStore(STORE_SALES);
  const settingsStore = tx.objectStore(STORE_SETTINGS);

  const currentSettings =
    (await idbRequest<ShopSettings | undefined>(settingsStore.get('shop_settings'))) ??
    { ...DEFAULT_SETTINGS };

  const saleItems: SaleItem[] = [];
  let subtotal = 0;
  let grossProfit = 0;

  for (const item of cartItems) {
    const dbProduct = await idbRequest<Product | undefined>(productStore.get(item.productId));
    if (!dbProduct) {
      throw new Error(`Product "${item.name}" no longer exists in inventory.`);
    }
    const qty = roundQty(item.qty);
    if (qty <= 0) {
      throw new Error(`Quantity for "${item.name}" must be greater than zero.`);
    }
    if (qty > roundQty(dbProduct.stock + 0.0001)) {
      throw new Error(`Insufficient stock for "${dbProduct.name}" (${dbProduct.stock} ${dbProduct.unit} left).`);
    }

    const lineTotal = Math.round(dbProduct.sellingPrice * qty * 100) / 100;
    const lineProfit = Math.round((dbProduct.sellingPrice - dbProduct.costPrice) * qty * 100) / 100;

    subtotal += lineTotal;
    grossProfit += lineProfit;

    saleItems.push({
      productId: dbProduct.id,
      code: dbProduct.code,
      name: dbProduct.name,
      unit: dbProduct.unit,
      size: dbProduct.size,
      qty,
      costPrice: dbProduct.costPrice,
      sellingPrice: dbProduct.sellingPrice,
      lineTotal,
      lineProfit,
    });

    const nextStock = roundQty(Math.max(0, dbProduct.stock - qty));
    productStore.put({
      ...dbProduct,
      stock: nextStock,
      updatedAt: Date.now(),
    });
  }

  const safeDiscount = Math.max(0, Math.min(subtotal, Number.isFinite(discountInput) ? discountInput : 0));
  const grandTotal = Math.max(0, Math.round((subtotal - safeDiscount) * 100) / 100);
  const netProfit = Math.round((grossProfit - safeDiscount) * 100) / 100;

  const now = Date.now();
  const billNumber = currentSettings.nextBillNumber || 1001;

  const sale: SaleRecord = {
    id: `sale-${now}-${billNumber}`,
    billNumber,
    timestamp: now,
    dateKey: getLocalDateKey(now),
    monthKey: getLocalMonthKey(now),
    items: saleItems,
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(safeDiscount * 100) / 100,
    grandTotal,
    netProfit,
    paymentMode,
  };

  const updatedSettings: ShopSettings = {
    ...currentSettings,
    id: 'shop_settings',
    nextBillNumber: billNumber + 1,
  };

  salesStore.put(sale);
  settingsStore.put(updatedSettings);

  const updatedProducts = await idbRequest<Product[]>(productStore.getAll());
  await txDone(tx);

  return {
    sale,
    updatedProducts: updatedProducts.sort((a, b) => a.name.localeCompare(b.name)),
    updatedSettings,
  };
}

export async function exportBackupData(): Promise<BackupPayload> {
  const db = await openDatabase();
  const tx = db.transaction([STORE_PRODUCTS, STORE_SALES, STORE_SETTINGS], 'readonly');
  const [products, sales, settings] = await Promise.all([
    idbRequest<Product[]>(tx.objectStore(STORE_PRODUCTS).getAll()),
    idbRequest<SaleRecord[]>(tx.objectStore(STORE_SALES).getAll()),
    idbRequest<ShopSettings | undefined>(tx.objectStore(STORE_SETTINGS).get('shop_settings')),
  ]);
  await txDone(tx);

  return {
    app: 'SovereignAtelierPOS',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    products,
    sales,
    settings: settings ?? { ...DEFAULT_SETTINGS },
  };
}

export function validateBackupPayload(raw: unknown): BackupPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid JSON backup file.');
  }
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.products) || !Array.isArray(obj.sales) || !obj.settings || typeof obj.settings !== 'object') {
    throw new Error('Backup file is missing required products, sales, or settings data.');
  }
  return obj as unknown as BackupPayload;
}

export async function importBackupData(payload: BackupPayload): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction([STORE_PRODUCTS, STORE_SALES, STORE_SETTINGS], 'readwrite');
  const productStore = tx.objectStore(STORE_PRODUCTS);
  const salesStore = tx.objectStore(STORE_SALES);
  const settingsStore = tx.objectStore(STORE_SETTINGS);

  productStore.clear();
  salesStore.clear();
  settingsStore.clear();

  for (const product of payload.products) {
    productStore.put(product);
  }
  for (const sale of payload.sales) {
    salesStore.put(sale);
  }
  settingsStore.put({
    ...DEFAULT_SETTINGS,
    ...payload.settings,
    id: 'shop_settings',
  });

  await txDone(tx);
}
