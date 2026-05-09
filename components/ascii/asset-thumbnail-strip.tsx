'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Grid2X2, Image as ImageIcon, Film, Eye, EyeOff, GripVertical } from 'lucide-react';
import { type Asset, MAX_ASSETS } from '@/hooks/use-asset-manager';
import { Button } from '@/components/ui/button';

interface AssetThumbnailStripProps {
  assets: Asset[];
  activeAssetId: string | null;
  compareMode: boolean;
  selectedForCompare: string[];
  onSelectAsset: (id: string) => void;
  onRemoveAsset: (id: string) => void;
  onToggleCompare: () => void;
  onToggleAssetForCompare: (id: string) => void;
  onReorderAssets: (fromIndex: number, toIndex: number) => void;
}

export function AssetThumbnailStrip({
  assets,
  activeAssetId,
  compareMode,
  selectedForCompare,
  onSelectAsset,
  onRemoveAsset,
  onToggleCompare,
  onToggleAssetForCompare,
  onReorderAssets,
}: AssetThumbnailStripProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const emptySlots = MAX_ASSETS - assets.length;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && index !== draggedIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      onReorderAssets(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="flex items-center justify-center gap-3 p-3 bg-preview-bg/80 backdrop-blur-sm border-t border-preview-foreground/10">
      {/* Thumbnail slots */}
      <div className="flex items-center gap-2">
        {assets.map((asset, index) => (
          <div
            key={asset.id}
            className={cn(
              'relative group',
              draggedIndex === index && 'opacity-50',
              dragOverIndex === index && 'scale-110'
            )}
            draggable={compareMode}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            <button
              onClick={() => compareMode ? onToggleAssetForCompare(asset.id) : onSelectAsset(asset.id)}
              className={cn(
                'relative w-12 h-12 rounded-md overflow-hidden transition-all duration-200',
                'ring-2 ring-offset-1 ring-offset-preview-bg',
                compareMode
                  ? selectedForCompare.includes(asset.id)
                    ? 'ring-preview-foreground scale-105'
                    : 'ring-transparent opacity-50'
                  : asset.id === activeAssetId
                    ? 'ring-preview-foreground/80 scale-105'
                    : 'ring-transparent hover:ring-preview-foreground/40'
              )}
              title={asset.name}
            >
              {asset.thumbnail ? (
                <img
                  src={asset.thumbnail}
                  alt={asset.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-preview-foreground/10 flex items-center justify-center">
                  {asset.type === 'video' ? (
                    <Film className="w-4 h-4 text-preview-foreground/40" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-preview-foreground/40" />
                  )}
                </div>
              )}
              
              {/* Video indicator badge */}
              {asset.type === 'video' && (
                <div className="absolute bottom-0.5 right-0.5 bg-preview-bg/70 rounded px-1">
                  <Film className="w-2.5 h-2.5 text-preview-foreground" />
                </div>
              )}

              {/* Compare mode visibility indicator */}
              {compareMode && (
                <div className={cn(
                  'absolute top-0.5 left-0.5 w-4 h-4 rounded-full flex items-center justify-center',
                  selectedForCompare.includes(asset.id) ? 'bg-preview-foreground' : 'bg-preview-bg/70'
                )}>
                  {selectedForCompare.includes(asset.id) ? (
                    <Eye className="w-2.5 h-2.5 text-preview-bg" />
                  ) : (
                    <EyeOff className="w-2.5 h-2.5 text-preview-foreground/60" />
                  )}
                </div>
              )}
            </button>
            
            {/* Drag handle indicator in compare mode */}
            {compareMode && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-3 h-3 text-preview-foreground/40" />
              </div>
            )}
            
            {/* Remove button */}
            {!compareMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveAsset(asset.id);
                }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-preview-foreground text-preview-bg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-preview-foreground/80"
                title="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        
        {/* Empty slots */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="w-12 h-12 rounded-md border-2 border-dashed border-preview-foreground/20 flex items-center justify-center"
          >
            <span className="text-preview-foreground/30 text-xs">{assets.length + i + 1}</span>
          </div>
        ))}
      </div>

      {/* Compare toggle button */}
      {assets.length >= 2 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCompare}
          className={cn(
            'h-9 px-3 text-xs transition-colors',
            compareMode
              ? 'bg-preview-foreground/15 text-preview-foreground hover:bg-preview-foreground/25'
              : 'text-preview-foreground/60 hover:text-preview-foreground hover:bg-preview-foreground/10'
          )}
        >
          <Grid2X2 className="w-4 h-4 mr-1.5" />
          {compareMode ? 'Exit Compare' : 'Compare'}
        </Button>
      )}
    </div>
  );
}
