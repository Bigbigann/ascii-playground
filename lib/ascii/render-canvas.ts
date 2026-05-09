import type { ColoredChar } from './converter';
import type { ASCIISettings } from './presets';

interface RenderOptions {
  // Logical (CSS-pixel) width and height of the drawing area.
  width: number;
  height: number;
  // Optional device-pixel ratio. Caller is responsible for sizing the canvas
  // backing store; this only sets the transform.
  dpr?: number;
}

/**
 * Render ASCII data onto a 2D canvas. Mirrors the on-screen render path used
 * by ASCIIVideo so exported frames look identical to the live preview.
 */
export function renderASCIIToCanvas(
  canvas: HTMLCanvasElement,
  data: ColoredChar[][],
  fontSize: number,
  settings: ASCIISettings,
  options: RenderOptions,
): void {
  if (data.length === 0) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height, dpr = 1 } = options;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const monoBgColor = settings.monoBgColor ?? '#0a0a0a';
  const monoCharColor = settings.monoCharColor ?? '#4ade80';

  const charWidth = fontSize * 0.6;
  const lineHeight = fontSize;
  const totalWidth = data[0].length * charWidth;
  const totalHeight = data.length * lineHeight;
  const offsetX = Math.max(0, (width - totalWidth) / 2);
  const offsetY = Math.max(0, (height - totalHeight) / 2);

  ctx.clearRect(0, 0, width, height);

  if (settings.colorMode === 'mono') {
    const padding = fontSize * 0.5;
    ctx.fillStyle = monoBgColor;
    ctx.fillRect(
      offsetX - padding,
      offsetY - padding,
      totalWidth + padding * 2,
      totalHeight + padding * 2,
    );
  }

  ctx.font = `${fontSize}px monospace`;
  ctx.textBaseline = 'top';

  const isColorMode = settings.colorMode === 'color' || settings.colorMode === 'duotone';
  const opacity = (settings.charOpacity ?? 100) / 100;
  const glowEnabled = settings.glowEnabled ?? false;
  const glowSize = settings.glowSize ?? 8;

  if (glowEnabled) {
    ctx.shadowBlur = glowSize;
  } else {
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  if (!isColorMode && !glowEnabled) {
    ctx.fillStyle = hexToRgba(monoCharColor, opacity);
    for (let y = 0; y < data.length; y++) {
      const row = data[y];
      let line = '';
      for (let x = 0; x < row.length; x++) line += row[x].char;
      ctx.fillText(line, offsetX, offsetY + y * lineHeight);
    }
    return;
  }

  for (let y = 0; y < data.length; y++) {
    const row = data[y];
    for (let x = 0; x < row.length; x++) {
      const item = row[x];
      if (item.char === ' ') continue;

      const color = isColorMode ? item.color : monoCharColor;

      if (glowEnabled) {
        ctx.shadowColor = item.glowColor;
        ctx.shadowBlur = glowSize;
      }

      if (color.startsWith('#')) {
        ctx.fillStyle = hexToRgba(color, opacity);
      } else {
        ctx.fillStyle = color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
      }
      ctx.fillText(item.char, offsetX + x * charWidth, offsetY + y * lineHeight);
    }
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
