import { useEffect, useState } from 'react';
import { ImagePlus, Trash2, X } from 'lucide-react';
import type { Product, ProductCategory, ProductUnit } from '../types/pos';
import { compressImageToDataUrl } from '../utils/formatters';
import { ProductImage } from './ProductImage';

interface ProductFormModalProps {
  isOpen: boolean;
  editingProduct: Product | null;
  currencySymbol: string;
  onSave: (product: Product) => Promise<void>;
  onClose: () => void;
}

const CATEGORIES: ProductCategory[] = ['Gents Cloth', 'Finger Rings', 'Accessories'];
const UNITS: ProductUnit[] = ['Meter', 'Suit', 'Piece'];

export function ProductFormModal({
  isOpen,
  editingProduct,
  currencySymbol,
  onSave,
  onClose,
}: ProductFormModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Gents Cloth');
  const [unit, setUnit] = useState<ProductUnit>('Meter');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState('');
  const [size, setSize] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [compressing, setCompressing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (editingProduct) {
      setName(editingProduct.name);
      setCode(editingProduct.code);
      setCategory(editingProduct.category);
      setUnit(editingProduct.unit);
      setCostPrice(String(editingProduct.costPrice));
      setSellingPrice(String(editingProduct.sellingPrice));
      setStock(String(editingProduct.stock));
      setSize(editingProduct.size ?? '');
      setImageDataUrl(editingProduct.imageDataUrl);
    } else {
      setName('');
      setCode(`ITM-${Math.floor(100 + Math.random() * 900)}`);
      setCategory('Gents Cloth');
      setUnit('Meter');
      setCostPrice('');
      setSellingPrice('');
      setStock('');
      setSize('');
      setImageDataUrl('');
    }
  }, [isOpen, editingProduct]);

  if (!isOpen) return null;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setCompressing(true);
    try {
      const compressed = await compressImageToDataUrl(file, 300, 0.82);
      setImageDataUrl(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compress image.');
    } finally {
      setCompressing(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    const parsedCost = parseFloat(costPrice);
    const parsedSell = parseFloat(sellingPrice);
    const parsedStock = parseFloat(stock);

    if (!trimmedName) {
      setError('Product name is required.');
      return;
    }
    if (!trimmedCode) {
      setError('Product code / SKU is required.');
      return;
    }
    if (Number.isNaN(parsedCost) || parsedCost < 0) {
      setError('Enter a valid Cost Price (Khareed).');
      return;
    }
    if (Number.isNaN(parsedSell) || parsedSell <= 0) {
      setError('Enter a valid Selling Price (Farokht).');
      return;
    }
    if (Number.isNaN(parsedStock) || parsedStock < 0) {
      setError('Enter a valid Stock Quantity.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({
        id: editingProduct ? editingProduct.id : `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        code: trimmedCode,
        name: trimmedName,
        category,
        unit,
        costPrice: Math.round(parsedCost * 100) / 100,
        sellingPrice: Math.round(parsedSell * 100) / 100,
        stock: Math.round(parsedStock * 100) / 100,
        size: size.trim() || undefined,
        imageDataUrl,
        updatedAt: Date.now(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={editingProduct ? 'Edit Product' : 'Add Product'}
    >
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-2xl overflow-hidden shadow-2xl my-auto">
        <div className="bg-[#1E293B] text-[#F8FAFC] px-5 py-4 flex items-center justify-between border-b border-[#334155]">
          <div>
            <h2 className="font-editorial text-2xl font-semibold">
              {editingProduct ? 'Edit Inventory Item' : 'Add New Product'}
            </h2>
            <p className="text-xs text-slate-400">
              Uploaded images are automatically resized to 300x300px for fast offline IndexedDB storage.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded bg-[#334155] hover:bg-slate-600 text-slate-200 cursor-pointer"
            aria-label="Close product form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded bg-rose-50 border border-rose-300 text-rose-900 text-sm font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="prod-name" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Product Name
              </label>
              <input
                id="prod-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Super 120s Charcoal Wool"
                className="w-full min-h-[48px] px-3.5 rounded bg-[#F8FAFC] border border-slate-300 text-[#1E293B] font-medium focus:outline-none focus:border-[#D97706]"
                required
              />
            </div>

            <div>
              <label htmlFor="prod-code" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Item Code / SKU
              </label>
              <input
                id="prod-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CL-105"
                className="w-full min-h-[48px] px-3.5 rounded bg-[#F8FAFC] border border-slate-300 text-[#1E293B] font-mono font-semibold focus:outline-none focus:border-[#D97706]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="prod-cat" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Category
              </label>
              <select
                id="prod-cat"
                value={category}
                onChange={(e) => {
                  const nextCat = e.target.value as ProductCategory;
                  setCategory(nextCat);
                  if (!editingProduct) {
                    setUnit(nextCat === 'Gents Cloth' ? 'Meter' : 'Piece');
                  }
                }}
                className="w-full min-h-[48px] px-3.5 rounded bg-[#F8FAFC] border border-slate-300 text-[#1E293B] font-semibold focus:outline-none focus:border-[#D97706]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="prod-unit" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Measurement Unit
              </label>
              <select
                id="prod-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as ProductUnit)}
                className="w-full min-h-[48px] px-3.5 rounded bg-[#F8FAFC] border border-slate-300 text-[#1E293B] font-semibold focus:outline-none focus:border-[#D97706]"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="prod-size" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Size (For Ready-Made / Rings)
              </label>
              <input
                id="prod-size"
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g., M, L, XL, 40, or 10"
                className="w-full min-h-[48px] px-3.5 rounded bg-[#F8FAFC] border border-slate-300 text-[#1E293B] font-semibold focus:outline-none focus:border-[#D97706]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1">Quick Size:</span>
            {['S', 'M', 'L', 'XL', 'XXL'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSize(preset)}
                className={`min-h-[36px] px-3 rounded text-xs font-bold border transition-colors cursor-pointer ${
                  size === preset
                    ? 'bg-[#1E293B] border-[#1E293B] text-[#F59E0B]'
                    : 'bg-[#F8FAFC] border-slate-300 text-slate-700 hover:border-[#D97706]'
                }`}
              >
                {preset}
              </button>
            ))}
            {size && (
              <button
                type="button"
                onClick={() => setSize('')}
                className="min-h-[36px] px-2.5 rounded text-xs font-semibold text-slate-500 hover:text-rose-700 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="prod-cost" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Cost Price / Khareed ({currencySymbol})
              </label>
              <input
                id="prod-cost"
                type="number"
                min="0"
                step="any"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="1400"
                className="w-full min-h-[48px] px-3.5 rounded bg-[#F8FAFC] border border-slate-300 text-[#1E293B] font-bold font-tabular focus:outline-none focus:border-[#D97706]"
                required
              />
            </div>

            <div>
              <label htmlFor="prod-sell" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Selling Price / Farokht ({currencySymbol})
              </label>
              <input
                id="prod-sell"
                type="number"
                min="1"
                step="any"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="2100"
                className="w-full min-h-[48px] px-3.5 rounded bg-[#F8FAFC] border border-slate-300 text-[#1E293B] font-bold font-tabular focus:outline-none focus:border-[#D97706]"
                required
              />
            </div>

            <div>
              <label htmlFor="prod-stock" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Stock Quantity ({unit})
              </label>
              <input
                id="prod-stock"
                type="number"
                min="0"
                step="any"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder={unit === 'Meter' ? '32.5' : '12'}
                className="w-full min-h-[48px] px-3.5 rounded bg-[#F8FAFC] border border-slate-300 text-[#1E293B] font-bold font-tabular focus:outline-none focus:border-[#D97706]"
                required
              />
            </div>
          </div>

          {/* Image Upload & Auto 300x300 Compression */}
          <div className="pt-2">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Product Photograph (Auto-Compressed Max 300x300px)
            </span>
            <div className="flex flex-wrap items-center gap-4 p-3.5 rounded bg-[#F8FAFC] border border-slate-200">
              <div className="w-24 h-20 rounded overflow-hidden border border-slate-300 bg-[#1E293B] shrink-0">
                <ProductImage
                  src={imageDataUrl}
                  alt={name || 'Preview'}
                  category={category}
                  className="w-full h-full"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                <label className="min-h-[48px] px-4 rounded bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer">
                  <ImagePlus className="w-4 h-4 text-[#F59E0B]" />
                  <span>{compressing ? 'Compressing...' : imageDataUrl ? 'Replace Photo' : 'Upload Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="sr-only"
                    disabled={compressing}
                  />
                </label>

                {imageDataUrl && (
                  <button
                    type="button"
                    onClick={() => setImageDataUrl('')}
                    className="min-h-[48px] px-3.5 rounded border border-slate-300 hover:bg-slate-200 text-slate-700 text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remove</span>
                  </button>
                )}

                {imageDataUrl.startsWith('data:image') && (
                  <span className="text-xs text-slate-500 font-tabular">
                    Compressed ({Math.round((imageDataUrl.length * 3) / 4 / 1024)} KB)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[50px] px-5 rounded border border-slate-300 hover:bg-slate-100 text-[#1E293B] text-sm font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || compressing}
              className="min-h-[50px] px-6 rounded bg-[#D97706] hover:bg-[#B45309] text-[#0F172A] text-sm font-bold cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingProduct ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
