'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { frameToColoredASCII, calculateFontSize, isHexColorLight, type ColoredChar } from '@/lib/ascii/converter';
import { renderASCIIToCanvas, downloadBlob } from '@/lib/ascii/render-canvas';
import type { ASCIISettings } from '@/lib/ascii/presets';

interface ASCIIImageProps {
  imageUrl: string;
  settings: ASCIISettings;
}

export interface ASCIIImageHandle {
  exportPNG: (filename: string) => void;
}

export const ASCIIImage = forwardRef<ASCIIImageHandle, ASCIIImageProps>(function ASCIIImage(
  { imageUrl, settings },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [asciiData, setAsciiData] = useState<ColoredChar[][]>([]);
  const [fontSize, setFontSize] = useState(10);
  const { resolvedTheme } = useTheme();

  // In mono mode the glyphs render against the configured monoBgColor box;
  // otherwise they render against the page preview-bg, which tracks the theme.
  const backgroundIsLight = settings.colorMode === 'mono'
    ? isHexColorLight(settings.monoBgColor ?? '#0a0a0a')
    : resolvedTheme === 'light';

  useEffect(() => {
    const img = new Image();
    // Only set crossOrigin for non-blob URLs
    if (!imageUrl.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    
    img.onload = () => {
      // Create canvas to extract image data
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = frameToColoredASCII(imageData, settings, settings.resolution, backgroundIsLight);
      setAsciiData(data);

      // Calculate font size to fit container
      if (containerRef.current && data.length > 0) {
        const { clientWidth, clientHeight } = containerRef.current;
        const charsPerLine = data[0]?.length || 1;
        const newFontSize = calculateFontSize(
          clientWidth,
          clientHeight,
          charsPerLine,
          data.length
        );
        setFontSize(Math.max(2, newFontSize));
      }
    };

    img.src = imageUrl;
  }, [imageUrl, settings, backgroundIsLight]);

  // Recalculate font size on resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && asciiData.length > 0) {
        const { clientWidth, clientHeight } = containerRef.current;
        const charsPerLine = asciiData[0]?.length || 1;
        const newFontSize = calculateFontSize(
          clientWidth,
          clientHeight,
          charsPerLine,
          asciiData.length
        );
        setFontSize(Math.max(2, newFontSize));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [asciiData]);

  // Expose imperative export. Renders the latest asciiData via the shared canvas
  // util at a fixed export font size for predictable output resolution.
  useImperativeHandle(ref, () => ({
    exportPNG: (filename: string) => {
      if (asciiData.length === 0) return;
      const exportFontSize = 16;
      const charWidth = exportFontSize * 0.6;
      const padding = settings.colorMode === 'mono' ? exportFontSize : 0;
      const width = Math.ceil(asciiData[0].length * charWidth + padding * 2);
      const height = Math.ceil(asciiData.length * exportFontSize + padding * 2);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      renderASCIIToCanvas(canvas, asciiData, exportFontSize, settings, { width, height });
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, filename);
      }, 'image/png');
    },
  }), [asciiData, settings]);

  // Glow style applied once to the whole block (textShadow inherits to all child glyphs).
  // In color/duotone mode the glow uses the mono char color as a uniform hue — per-char
  // glow color was prohibitively expensive at high resolutions.
  const blockGlowStyle = useMemo(() => {
    if (!(settings.glowEnabled ?? false)) return undefined;
    const intensity = (settings.glowIntensity ?? 50) / 100;
    const size = settings.glowSize ?? 8;
    const color = settings.monoCharColor ?? '#4ade80';
    return {
      textShadow: `0 0 ${size * 0.5}px ${color}, 0 0 ${size}px ${color}, 0 0 ${size * 1.5}px ${color}`,
      filter: `brightness(${1 + intensity * 0.5})`,
    } as React.CSSProperties;
  }, [settings.glowEnabled, settings.glowIntensity, settings.glowSize, settings.monoCharColor]);

  const isColorMode = settings.colorMode === 'color' || settings.colorMode === 'duotone';
  
  // Monochrome colors from settings
  const monoBgColor = settings.monoBgColor ?? '#0a0a0a';
  const monoCharColor = settings.monoCharColor ?? '#4ade80';

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden"
    >
      <div
        className="leading-none select-all rounded"
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: 1,
          fontFamily: 'monospace',
          opacity: settings.charOpacity / 100,
          backgroundColor: settings.colorMode === 'mono' ? monoBgColor : undefined,
          padding: settings.colorMode === 'mono' ? '0.5em' : undefined,
          ...blockGlowStyle,
        }}
      >
        {asciiData.map((row, rowIndex) => (
          <div key={rowIndex} className="whitespace-pre">
            {isColorMode ? (
              // Colored/Duotone mode: each character has its own color
              row.map((item, charIndex) => (
                <span key={charIndex} style={{ color: item.color }}>
                  {item.char}
                </span>
              ))
            ) : (
              // Monochrome mode: single span
              <span style={{ color: monoCharColor }}>
                {row.map(item => item.char).join('')}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});
