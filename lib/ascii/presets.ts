export const CHARSETS = {
  standard: ' .:-=+*#%@',
  detailed: ' .`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  blocks: ' ░▒▓█',
  minimal: ' .:#',
  binary: ' █',
  dots: ' ·•●',
} as const;

export type CharsetName = keyof typeof CHARSETS;

export const CHARSET_OPTIONS: { value: CharsetName | 'custom'; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'blocks', label: 'Blocks' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'binary', label: 'Binary' },
  { value: 'dots', label: 'Dots' },
  { value: 'custom', label: 'Custom' },
];

// Custom character preset options
export const CUSTOM_CHAR_PRESETS: { value: string; label: string }[] = [
  { value: ' .:-=+*#%@', label: 'Classic' },
  { value: ' v+#@', label: 'Arrows' },
  { value: ' .,;:!?#@', label: 'Punctuation' },
  { value: ' oxOX@', label: 'Circles' },
  { value: ' /|\\-+*#', label: 'Lines' },
  { value: ' <>^v+*#@', label: 'Geometric' },
  { value: ' ._-~=+*#%@', label: 'Waves' },
  { value: ' 0123456789', label: 'Numbers' },
  { value: ' abcdefgh', label: 'Letters' },
  { value: 'custom', label: 'Custom...' },
];

export type ColorMode = 'mono' | 'color' | 'duotone';

export const COLOR_MODE_OPTIONS: { value: ColorMode; label: string }[] = [
  { value: 'mono', label: 'Monochrome' },
  { value: 'color', label: 'Original Color' },
  { value: 'duotone', label: 'Duotone' },
];

// Duotone preset color pairs
export const DUOTONE_PRESETS: { value: string; label: string; dark: string; light: string }[] = [
  { value: 'cyan-magenta', label: 'Cyan / Magenta', dark: '#0891b2', light: '#e879f9' },
  { value: 'orange-blue', label: 'Orange / Blue', dark: '#1e40af', light: '#fb923c' },
  { value: 'purple-gold', label: 'Purple / Gold', dark: '#7c3aed', light: '#fbbf24' },
  { value: 'green-pink', label: 'Green / Pink', dark: '#059669', light: '#f472b6' },
  { value: 'red-teal', label: 'Red / Teal', dark: '#0d9488', light: '#ef4444' },
  { value: 'blue-yellow', label: 'Blue / Yellow', dark: '#2563eb', light: '#facc15' },
];

// Monochrome color presets (background + character color)
export const MONO_COLOR_PRESETS: { value: string; label: string; bg: string; char: string }[] = [
  { value: 'classic', label: 'Classic Green', bg: '#0a0a0a', char: '#4ade80' },
  { value: 'royal-blue', label: 'Royal Blue', bg: '#0a0a6e', char: '#e0e8ff' },
  { value: 'amber', label: 'Amber Terminal', bg: '#1a1000', char: '#ffb000' },
  { value: 'matrix', label: 'Matrix', bg: '#000800', char: '#00ff41' },
  { value: 'purple-haze', label: 'Purple Haze', bg: '#1a0a2e', char: '#c084fc' },
  { value: 'ocean', label: 'Ocean', bg: '#0a1628', char: '#38bdf8' },
  { value: 'sunset', label: 'Sunset', bg: '#1f0a0a', char: '#fb923c' },
  { value: 'mint', label: 'Mint', bg: '#0a1a1a', char: '#5eead4' },
  { value: 'custom', label: 'Custom', bg: '#0a0a0a', char: '#ffffff' },
];

export interface ASCIISettings {
  charset: CharsetName | 'custom';
  customChars: string; // Custom character set when charset is 'custom'
  resolution: number; // 50-400 characters width
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  charOpacity: number; // 0-100 opacity of characters
  colorMode: ColorMode; // mono, color, or duotone
  duotonePreset: string; // duotone color preset
  monoPreset: string; // monochrome color preset
  monoBgColor: string; // monochrome background color
  monoCharColor: string; // monochrome character color
  glowEnabled: boolean; // enable glow effect
  glowIntensity: number; // 0-100 glow intensity
  glowSize: number; // 1-20 glow blur radius
  playbackSpeed: number; // 0.25 to 2
  invert: boolean;
}

export const DEFAULT_SETTINGS: ASCIISettings = {
  charset: 'dots',
  customChars: ' v+#@',
  resolution: 240,
  brightness: 0,
  contrast: 0,
  charOpacity: 100,
  colorMode: 'mono',
  duotonePreset: 'cyan-magenta',
  monoPreset: 'classic',
  monoBgColor: '#0a0a0a',
  monoCharColor: '#4ade80',
  glowEnabled: false,
  glowIntensity: 50,
  glowSize: 8,
  playbackSpeed: 1,
  invert: false,
};
