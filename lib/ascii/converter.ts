import { CHARSETS, DUOTONE_PRESETS, type ASCIISettings, type CharsetName } from './presets';

export interface ColoredChar {
  char: string;
  color: string; // RGB color string
  glowColor: string; // Color for glow effect (original color)
}

/**
 * Interpolate between two hex colors based on brightness
 */
function interpolateColor(dark: string, light: string, t: number): string {
  const parseHex = (hex: string) => {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  };
  
  const d = parseHex(dark);
  const l = parseHex(light);
  
  const r = Math.round(d.r + (l.r - d.r) * t);
  const g = Math.round(d.g + (l.g - d.g) * t);
  const b = Math.round(d.b + (l.b - d.b) * t);
  
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Returns true if a hex color renders as a light background.
 */
export function isHexColorLight(hex: string): boolean {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 127;
}

/**
 * Convert a video frame to ASCII art (monochrome - returns string array)
 */
export function frameToASCII(
  imageData: ImageData,
  settings: ASCIISettings,
  targetWidth: number,
  backgroundIsLight = false
): string[] {
  const result = frameToColoredASCII(imageData, settings, targetWidth, backgroundIsLight);
  return result.map(row => row.map(c => c.char).join(''));
}

/**
 * Convert a video frame to colored ASCII art.
 *
 * `backgroundIsLight` flips the brightness→density ramp so dense glyphs always
 * map to source pixels that are *opposite* the rendering background. Without
 * this, light themes render an inverted-looking image because the ramp assumes
 * a dark backdrop where dense glyphs deposit bright ink.
 */
export function frameToColoredASCII(
  imageData: ImageData,
  settings: ASCIISettings,
  targetWidth: number,
  backgroundIsLight = false
): ColoredChar[][] {
  const { width, height, data } = imageData;
  
  // Use custom chars if selected, otherwise use preset
  const charset = settings.charset === 'custom'
    ? (settings.customChars || ' .:#@')
    : CHARSETS[settings.charset];
  
  // Calculate sampling rate based on target width
  const sampleX = Math.max(1, Math.floor(width / targetWidth));
  const sampleY = Math.floor(sampleX * 2); // Characters are ~2x taller than wide

  // Hoist invariants outside the per-pixel loop
  const brightnessOffset = settings.brightness * 2.55;
  const contrastFactor = settings.contrast !== 0
    ? (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast))
    : 1;
  const charsetLen = charset.length;
  const isDuotone = settings.colorMode === 'duotone';
  const duotonePreset = isDuotone
    ? (DUOTONE_PRESETS.find((p) => p.value === settings.duotonePreset) ?? DUOTONE_PRESETS[0])
    : null;

  const adjust = (value: number) => {
    const v = contrastFactor * (value + brightnessOffset - 128) + 128;
    return v < 0 ? 0 : v > 255 ? 255 : v;
  };

  const lines: ColoredChar[][] = [];

  for (let y = 0; y < height; y += sampleY) {
    const row: ColoredChar[] = [];

    for (let x = 0; x < width; x += sampleX) {
      const idx = (y * width + x) * 4;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Luminance — used both for character selection and (when duotone) color interpolation
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      const adjustedBrightness = adjust(luminance);

      // Map brightness to character index. The ramp is keyed off whether the
      // glyph will render against a light or dark background: dense glyphs
      // should always represent pixels opposite the backdrop. `settings.invert`
      // flips this on top of the auto behavior.
      const flip = settings.invert !== backgroundIsLight; // XOR
      const normalized = flip
        ? adjustedBrightness / 255
        : 1 - adjustedBrightness / 255;

      const charIndex = Math.min(charsetLen - 1, Math.floor(normalized * charsetLen));
      const char = charset[charIndex];

      const glowColor = `rgb(${r}, ${g}, ${b})`;

      let displayColor: string;
      if (isDuotone && duotonePreset) {
        displayColor = interpolateColor(duotonePreset.dark, duotonePreset.light, luminance / 255);
      } else {
        const dr = Math.round(adjust(r));
        const dg = Math.round(adjust(g));
        const db = Math.round(adjust(b));
        displayColor = `rgb(${dr}, ${dg}, ${db})`;
      }

      row.push({ char, color: displayColor, glowColor });
    }

    lines.push(row);
  }

  return lines;
}

/**
 * Get character set by name
 */
export function getCharset(name: CharsetName): string {
  return CHARSETS[name];
}

/**
 * Calculate optimal font size to fit ASCII art in container
 */
export function calculateFontSize(
  containerWidth: number,
  containerHeight: number,
  charsPerLine: number,
  lineCount: number
): number {
  // Monospace character aspect ratio is roughly 0.6 (width/height)
  const charAspect = 0.6;
  
  const maxFontWidth = containerWidth / (charsPerLine * charAspect);
  const maxFontHeight = containerHeight / lineCount;
  
  return Math.min(maxFontWidth, maxFontHeight, 16); // Cap at 16px
}
