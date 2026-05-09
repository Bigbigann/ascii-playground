'use client';

import { type Asset } from '@/hooks/use-asset-manager';
import { ASCIIImage } from './ascii-image';
import { ASCIIVideo } from './ascii-video';

interface CompareGridProps {
  assets: Asset[];
  onSelectAsset: (id: string) => void;
}

export function CompareGrid({ assets, onSelectAsset }: CompareGridProps) {
  const count = assets.length;
  
  // Determine grid layout based on asset count
  const getGridClass = () => {
    const base = 'w-full h-full grid gap-2 p-2';
    if (count === 1) return `${base} grid-cols-1 grid-rows-1`;
    if (count === 2) return `${base} grid-cols-2 grid-rows-1`;
    return `${base} grid-cols-2 grid-rows-2`;
  };

  const getItemClass = (index: number) => {
    const base = 'relative rounded-lg overflow-hidden border bg-preview-bg text-left transition-colors border-preview-foreground/10 hover:border-preview-foreground/30';
    const span = count === 3 && index === 2 ? 'col-span-2' : '';
    return `${base} ${span}`.trim();
  };

  return (
    <div className={getGridClass()}>
      {assets.map((asset, index) => (
        <button
          key={asset.id}
          onClick={() => onSelectAsset(asset.id)}
          className={getItemClass(index)}
        >
          {/* ASCII preview - uses individual asset settings */}
          <div className="w-full h-full">
            {asset.type === 'image' ? (
              <ASCIIImage imageUrl={asset.url} settings={asset.settings} />
            ) : (
              <ASCIIVideo videoUrl={asset.url} settings={asset.settings} />
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
