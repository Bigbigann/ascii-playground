'use client';

import { useState, useCallback } from 'react';
import { DEFAULT_SETTINGS, type ASCIISettings } from '@/lib/ascii/presets';

export type MediaType = 'image' | 'video';

export interface Asset {
  id: string;
  url: string;
  type: MediaType;
  thumbnail: string;
  name: string;
  settings: ASCIISettings;
}

export const MAX_ASSETS = 4;

export function useAssetManager() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  const generateThumbnail = useCallback((file: File, url: string): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('video/')) {
        // For video, capture first frame
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.src = url;
        video.muted = true;
        video.onloadeddata = () => {
          video.currentTime = 0.1; // Seek slightly into video
        };
        video.onseeked = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 80;
          canvas.height = 80;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const scale = Math.min(80 / video.videoWidth, 80 / video.videoHeight);
            const w = video.videoWidth * scale;
            const h = video.videoHeight * scale;
            ctx.drawImage(video, (80 - w) / 2, (80 - h) / 2, w, h);
          }
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        video.onerror = () => resolve('');
      } else {
        // For image
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 80;
          canvas.height = 80;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const scale = Math.min(80 / img.width, 80 / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            ctx.drawImage(img, (80 - w) / 2, (80 - h) / 2, w, h);
          }
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => resolve('');
        img.src = url;
      }
    });
  }, []);

  const addAsset = useCallback(async (file: File, url: string, type: MediaType) => {
    const thumbnail = await generateThumbnail(file, url);
    const newAsset: Asset = {
      id: crypto.randomUUID(),
      url,
      type,
      thumbnail,
      name: file.name,
      settings: { ...DEFAULT_SETTINGS },
    };

    setAssets((prev) => {
      if (prev.length >= MAX_ASSETS) {
        URL.revokeObjectURL(prev[0].url);
        return [...prev.slice(1), newAsset];
      }
      return [...prev, newAsset];
    });
    setActiveAssetId(newAsset.id);

    return newAsset;
  }, [generateThumbnail]);

  const removeAsset = useCallback((id: string) => {
    setAssets((prev) => {
      const asset = prev.find((a) => a.id === id);
      if (asset) {
        URL.revokeObjectURL(asset.url);
      }
      const remaining = prev.filter((a) => a.id !== id);
      setActiveAssetId((currentActive) =>
        currentActive === id
          ? remaining[remaining.length - 1]?.id ?? null
          : currentActive
      );
      return remaining;
    });

    setSelectedForCompare((prev) => prev.filter((assetId) => assetId !== id));
  }, []);

  const setActiveAsset = useCallback((id: string) => {
    setActiveAssetId(id);
  }, []);

  const toggleCompareMode = useCallback(() => {
    setCompareMode((prev) => {
      if (!prev) {
        // Entering compare mode - select all assets by default
        setSelectedForCompare(assets.map((a) => a.id));
      }
      return !prev;
    });
  }, [assets]);

  const toggleAssetForCompare = useCallback((id: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) {
        return prev.filter((assetId) => assetId !== id);
      }
      return [...prev, id];
    });
  }, []);

  const updateAssetSettings = useCallback((id: string, newSettings: ASCIISettings) => {
    setAssets((prev) => 
      prev.map((asset) => 
        asset.id === id ? { ...asset, settings: newSettings } : asset
      )
    );
  }, []);

  const reorderAssets = useCallback((fromIndex: number, toIndex: number) => {
    setAssets((prev) => {
      const result = [...prev];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  }, []);

  const activeAsset = assets.find((a) => a.id === activeAssetId) || null;
  const compareAssets = assets.filter((a) => selectedForCompare.includes(a.id));

  return {
    assets,
    activeAsset,
    activeAssetId,
    compareMode,
    compareAssets,
    selectedForCompare,
    canAddMore: assets.length < MAX_ASSETS,
    addAsset,
    removeAsset,
    setActiveAsset,
    toggleCompareMode,
    toggleAssetForCompare,
    updateAssetSettings,
    reorderAssets,
  };
}
