import { useState } from 'react';
import { Gem, Scissors, Watch } from 'lucide-react';
import type { ProductCategory } from '../types/pos';

interface ProductImageProps {
  src: string;
  alt: string;
  category: ProductCategory;
  className?: string;
}

export function ProductImage({ src, alt, category, className = '' }: ProductImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#1E293B] text-[#D97706]/80 select-none ${className}`}
        aria-label={alt}
      >
        {category === 'Finger Rings' ? (
          <Gem className="w-8 h-8 stroke-[1.5]" />
        ) : category === 'Gents Cloth' ? (
          <Scissors className="w-8 h-8 stroke-[1.5]" />
        ) : (
          <Watch className="w-8 h-8 stroke-[1.5]" />
        )}
        <span className="mt-1.5 text-[11px] font-medium text-slate-300 px-2 text-center line-clamp-1">
          {category}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`object-cover ${className}`}
      loading="lazy"
    />
  );
}
