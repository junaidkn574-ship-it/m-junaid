import type { ProductUnit } from '../types/pos';

export function formatMoney(amount: number, currencySymbol = 'Rs.'): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const formatted = Math.round(safe).toLocaleString('en-US');
  return `${currencySymbol} ${formatted}`;
}

export function formatQty(qty: number, unit?: ProductUnit): string {
  const rounded = Math.round(qty * 100) / 100;
  const numStr = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '');
  if (!unit) return numStr;
  const shortUnit = unit === 'Meter' ? 'm' : unit === 'Suit' ? (rounded === 1 ? 'suit' : 'suits') : (rounded === 1 ? 'pc' : 'pcs');
  return `${numStr} ${shortUnit}`;
}

export function getLocalDateKey(dateInput: Date | number = new Date()): string {
  const d = typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalMonthKey(dateInput: Date | number = new Date()): string {
  return getLocalDateKey(dateInput).slice(0, 7);
}

export function getYesterdayDateKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateKey(d);
}

export function formatReceiptDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  const datePart = d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timePart = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart} · ${timePart}`;
}

/**
 * Resizes and compresses any uploaded image file to max 300x300px JPEG Data URL
 * before storing in IndexedDB so local storage stays fast and compact.
 */
export function compressImageToDataUrl(file: File, maxDim = 300, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported or corrupted image format.'));
      img.onload = () => {
        let { width, height } = img;
        if (width <= 0 || height <= 0) {
          reject(new Error('Invalid image dimensions.'));
          return;
        }

        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable for image compression.'));
          return;
        }

        // Fill neutral light background in case source PNG/WebP has alpha transparency
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function roundQty(val: number): number {
  return Math.round(val * 100) / 100;
}
