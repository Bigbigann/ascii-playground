'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useTheme } from 'next-themes';
import { ControlPanel } from '@/components/ascii/control-panel';
import { ASCIIImage, type ASCIIImageHandle } from '@/components/ascii/ascii-image';
import { ASCIIVideo, type ASCIIVideoHandle } from '@/components/ascii/ascii-video';
import { AssetThumbnailStrip } from '@/components/ascii/asset-thumbnail-strip';
import { CompareGrid } from '@/components/ascii/compare-grid';
import { useAssetManager, MAX_ASSETS } from '@/hooks/use-asset-manager';
import { useBackgroundAudio } from '@/hooks/use-background-audio';
import { AudioControls } from '@/components/ascii/audio-controls';
import { Button } from '@/components/ui/button';
import { Upload, Menu, ImageIcon, PanelRightClose, PanelRightOpen, Download, Loader2, VolumeX } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = 'image/png,image/jpeg,image/jpg,image/gif,image/webp,video/mp4,video/webm,video/ogg,video/quicktime';

const SCRAMBLE_GLYPHS = '!@#$%^&*()_+-=<>?/\\|[]{}~"\'.;:,1234567890';

function LandingAmbient({ enabled }: { enabled: boolean }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const src = resolvedTheme === 'dark' ? '/night.mp3' : '/day.mp3';

  useEffect(() => {
    if (!mounted || !enabled) return;
    const a = audioRef.current;
    if (!a) return;
    a.volume = 1.0;
    a.loop = true;
    a.play().catch(() => {});
    return () => {
      a.pause();
    };
  }, [mounted, enabled, src]);

  if (!mounted || !enabled) return null;
  return <audio ref={audioRef} src={src} preload="auto" />;
}

type RainParams = {
  count: number;
  speedMin: number;
  speedMax: number;
  alphaMin: number;
  alphaMax: number;
  fontSize: number;
  color: string;
};

type DustParams = {
  count: number;
  driftMax: number;
  bobAmp: number;
  alphaMin: number;
  alphaMax: number;
  fontSize: number;
  color: string;
};

const DEFAULT_RAIN: RainParams = {
  count: 140,
  speedMin: 290,
  speedMax: 380,
  alphaMin: 0.35,
  alphaMax: 0.8,
  fontSize: 14,
  color: '#dcdcdc',
};

const DEFAULT_DUST: DustParams = {
  count: 160,
  driftMax: 24,
  bobAmp: 7.25,
  alphaMin: 0.5,
  alphaMax: 0.75,
  fontSize: 16,
  color: '#282828',
};

function hexToRgb(hex: string): string {
  const m = hex.replace('#', '').match(/.{1,2}/g);
  if (!m || m.length < 3) return '128, 128, 128';
  return `${parseInt(m[0], 16)}, ${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}`;
}

function AmbientField({
  enabled,
  rain,
  dust,
}: {
  enabled: boolean;
  rain: RainParams;
  dust: DustParams;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paramsRef = useRef({ rain, dust });
  paramsRef.current = { rain, dust };

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !enabled) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isDark = resolvedTheme === 'dark';
    const glyphs = isDark ? ['|', ':', '.', "'"] : ['·', '.', ','];
    const dpr = window.devicePixelRatio || 1;

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      char: string;
      alpha: number;
      bobPhase: number;
      bobAmp: number;
    };

    let w = 0;
    let h = 0;
    let particles: Particle[] = [];

    const spawn = (initial: boolean): Particle => {
      const p = paramsRef.current;
      const char = glyphs[Math.floor(Math.random() * glyphs.length)];
      if (isDark) {
        const a = p.rain.alphaMin + Math.random() * Math.max(0, p.rain.alphaMax - p.rain.alphaMin);
        return {
          x: Math.random() * w,
          y: initial ? Math.random() * h : -10,
          vx: 0,
          vy: p.rain.speedMin + Math.random() * Math.max(0, p.rain.speedMax - p.rain.speedMin),
          char,
          alpha: a,
          bobPhase: 0,
          bobAmp: 0,
        };
      }
      const a = p.dust.alphaMin + Math.random() * Math.max(0, p.dust.alphaMax - p.dust.alphaMin);
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (-1 + Math.random() * 2) * p.dust.driftMax,
        vy: (-1 + Math.random() * 2) * p.dust.driftMax * 0.5,
        char,
        alpha: a,
        bobPhase: Math.random() * Math.PI * 2,
        bobAmp: p.dust.bobAmp * (0.5 + Math.random()),
      };
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const reseed = () => {
      const target = isDark ? paramsRef.current.rain.count : paramsRef.current.dust.count;
      if (particles.length < target) {
        while (particles.length < target) particles.push(spawn(true));
      } else if (particles.length > target) {
        particles.length = target;
      }
    };

    resize();
    const initialCount = isDark ? paramsRef.current.rain.count : paramsRef.current.dust.count;
    particles = Array.from({ length: initialCount }, () => spawn(true));

    const ro = new ResizeObserver(() => resize());
    ro.observe(container);

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      reseed();
      const cur = paramsRef.current;
      const fontSize = isDark ? cur.rain.fontSize : cur.dust.fontSize;
      const colorRgb = hexToRgb(isDark ? cur.rain.color : cur.dust.color);
      ctx.clearRect(0, 0, w, h);
      ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textBaseline = 'top';
      for (const p of particles) {
        if (isDark) {
          p.y += p.vy * dt;
          if (p.y > h + 10) {
            p.y = -10;
            p.x = Math.random() * w;
          }
          ctx.fillStyle = `rgba(${colorRgb}, ${p.alpha})`;
          ctx.fillText(p.char, p.x, p.y);
        } else {
          p.bobPhase += dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.x < -10) p.x = w + 10;
          if (p.x > w + 10) p.x = -10;
          if (p.y < -10) p.y = h + 10;
          if (p.y > h + 10) p.y = -10;
          const drawY = p.y + Math.sin(p.bobPhase) * p.bobAmp;
          ctx.fillStyle = `rgba(${colorRgb}, ${p.alpha})`;
          ctx.fillText(p.char, p.x, drawY);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [mounted, enabled, resolvedTheme]);

  if (!mounted || !enabled) return null;
  return (
    <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none">
      <canvas ref={canvasRef} />
    </div>
  );
}

function TunerRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  fmt,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  fmt?: (n: number) => string;
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] font-mono">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-foreground"
      />
      <span className="w-10 text-right tabular-nums">{fmt ? fmt(value) : value}</span>
    </label>
  );
}

function AmbientTuner({
  rain,
  dust,
  onRainChange,
  onDustChange,
  onReset,
}: {
  rain: RainParams;
  dust: DustParams;
  onRainChange: (p: RainParams) => void;
  onDustChange: (p: DustParams) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="absolute bottom-4 left-4 z-30 w-72 rounded-md border border-border bg-background/90 backdrop-blur-md shadow-lg pointer-events-auto">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[11px] font-mono font-semibold tracking-wider uppercase text-muted-foreground">
          Ambient tuner
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onReset}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Reset to defaults"
          >
            reset
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            {open ? '−' : '+'}
          </button>
        </div>
      </div>
      {open && (
        <div className="p-3 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
                Rain (dark)
              </span>
              <input
                type="color"
                value={rain.color}
                onChange={(e) => onRainChange({ ...rain, color: e.target.value })}
                className="h-4 w-6 cursor-pointer bg-transparent border-0 p-0"
              />
            </div>
            <TunerRow label="count" min={0} max={400} step={5} value={rain.count}
              onChange={(n) => onRainChange({ ...rain, count: n })} />
            <TunerRow label="speed min" min={0} max={600} step={10} value={rain.speedMin}
              onChange={(n) => onRainChange({ ...rain, speedMin: n })} />
            <TunerRow label="speed max" min={0} max={800} step={10} value={rain.speedMax}
              onChange={(n) => onRainChange({ ...rain, speedMax: n })} />
            <TunerRow label="alpha min" min={0} max={1} step={0.05} value={rain.alphaMin}
              fmt={(n) => n.toFixed(2)}
              onChange={(n) => onRainChange({ ...rain, alphaMin: n })} />
            <TunerRow label="alpha max" min={0} max={1} step={0.05} value={rain.alphaMax}
              fmt={(n) => n.toFixed(2)}
              onChange={(n) => onRainChange({ ...rain, alphaMax: n })} />
            <TunerRow label="font size" min={6} max={28} step={1} value={rain.fontSize}
              onChange={(n) => onRainChange({ ...rain, fontSize: n })} />
          </div>
          <div className="space-y-1.5 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
                Dust (light)
              </span>
              <input
                type="color"
                value={dust.color}
                onChange={(e) => onDustChange({ ...dust, color: e.target.value })}
                className="h-4 w-6 cursor-pointer bg-transparent border-0 p-0"
              />
            </div>
            <TunerRow label="count" min={0} max={200} step={5} value={dust.count}
              onChange={(n) => onDustChange({ ...dust, count: n })} />
            <TunerRow label="drift max" min={0} max={40} step={1} value={dust.driftMax}
              onChange={(n) => onDustChange({ ...dust, driftMax: n })} />
            <TunerRow label="bob amp" min={0} max={10} step={0.25} value={dust.bobAmp}
              fmt={(n) => n.toFixed(2)}
              onChange={(n) => onDustChange({ ...dust, bobAmp: n })} />
            <TunerRow label="alpha min" min={0} max={1} step={0.05} value={dust.alphaMin}
              fmt={(n) => n.toFixed(2)}
              onChange={(n) => onDustChange({ ...dust, alphaMin: n })} />
            <TunerRow label="alpha max" min={0} max={1} step={0.05} value={dust.alphaMax}
              fmt={(n) => n.toFixed(2)}
              onChange={(n) => onDustChange({ ...dust, alphaMax: n })} />
            <TunerRow label="font size" min={6} max={28} step={1} value={dust.fontSize}
              onChange={(n) => onDustChange({ ...dust, fontSize: n })} />
          </div>
        </div>
      )}
    </div>
  );
}

function AmbientToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [tipOpen, setTipOpen] = useState(true);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    const id = setTimeout(() => setTipOpen(false), 5000);
    return () => clearTimeout(id);
  }, [mounted]);
  if (!mounted) return null;
  const label = on ? 'Silence the cat' : 'Wake the cat';
  return (
    <Tooltip open={tipOpen} onOpenChange={setTipOpen}>
      <TooltipTrigger asChild>
        <button
          onClick={onToggle}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label={label}
        >
          {on ? (
            <div className="flex items-end gap-0.5 h-4 w-4 px-0.5 py-[3px]">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="flex-1 bg-current rounded-sm"
                  animate={{ scaleY: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.7 + i * 0.1, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
                  style={{ originY: 1, height: '100%' }}
                />
              ))}
            </div>
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent
        className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-white dark:border-neutral-800"
        arrowClassName="bg-white fill-white dark:bg-neutral-900 dark:fill-neutral-900"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function AmbientPrompt({
  visible,
  onWake,
  onDismiss,
}: {
  visible: boolean;
  onWake: () => void;
  onDismiss: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted || !visible) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="m-3 mt-auto"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onWake}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onWake();
          }
        }}
        className="relative w-full text-left rounded-md border border-border bg-background/95 backdrop-blur-sm p-3 pr-8 cursor-pointer hover:border-foreground/40 transition-colors"
      >
        <div className="flex items-start gap-2.5">
          <div className="flex items-end gap-0.5 h-4 w-4 mt-0.5 px-0.5 py-[3px] text-foreground/70 shrink-0">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="flex-1 bg-current rounded-sm"
                animate={{ scaleY: [0.3, 1, 0.3] }}
                transition={{ duration: 0.9 + i * 0.1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                style={{ originY: 1, height: '100%' }}
              />
            ))}
          </div>
          <div className="flex flex-col gap-0.5 leading-snug">
            <p className="text-xs font-mono font-semibold text-foreground">
              shh — the cat dreams in ascii.
            </p>
            <p className="text-[11px] font-mono text-muted-foreground">
              tap to listen in.
            </p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          aria-label="Dismiss"
          className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

function Scramble({ text, durationMs = 700, className }: { text: string; durationMs?: number; className?: string }) {
  const [display, setDisplay] = useState(() => text.replace(/\S/g, '_'));

  useEffect(() => {
    const settleAt = text.split('').map(() => 150 + Math.random() * (durationMs - 150));
    const start = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start;
      let allSettled = true;
      const next = text.split('').map((c, i) => {
        if (c === ' ') return ' ';
        if (elapsed >= settleAt[i]) return c;
        allSettled = false;
        return SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)];
      });
      setDisplay(next.join(''));
      return allSettled;
    };
    const id = setInterval(() => {
      if (tick()) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [text, durationMs]);

  return <span className={className}>{display}</span>;
}

export default function ASCIIPlayground() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [ambientOn, setAmbientOn] = useState(false);
  const [ambientPromptDismissed, setAmbientPromptDismissed] = useState(false);
  const [rainParams, setRainParams] = useState<RainParams>(DEFAULT_RAIN);
  const [dustParams, setDustParams] = useState<DustParams>(DEFAULT_DUST);
  const [tunerEnabled, setTunerEnabled] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setTunerEnabled(new URLSearchParams(window.location.search).get('tune') === '1');
  }, []);
  const imageRef = useRef<ASCIIImageHandle>(null);
  const videoRef = useRef<ASCIIVideoHandle>(null);

  const {
    assets,
    activeAsset,
    activeAssetId,
    compareMode,
    compareAssets,
    selectedForCompare,
    addAsset,
    removeAsset,
    setActiveAsset,
    toggleCompareMode,
    toggleAssetForCompare,
    updateAssetSettings,
    reorderAssets,
  } = useAssetManager();

  const ingestFile = useCallback(async (file: File) => {
    if (!ACCEPTED_TYPES.split(',').includes(file.type)) return;
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');
    await addAsset(file, url, isVideo ? 'video' : 'image');
  }, [addAsset]);

  const handleFileSelect = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPTED_TYPES;
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) ingestFile(file);
    };
    input.click();
  }, [ingestFile]);

  const audio = useBackgroundAudio();

  useEffect(() => {
    if (audio.isPlaying) setAmbientOn(false);
  }, [audio.isPlaying]);

  useEffect(() => {
    if (ambientOn) setAmbientPromptDismissed(true);
  }, [ambientOn]);

  const handleAudioUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) audio.load(file);
    };
    input.click();
  }, [audio]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files[0];
    if (file) ingestFile(file);
  }, [ingestFile]);

  const hasAssets = assets.length > 0;
  const hasVideoAsset = assets.some((a) => a.type === 'video');

  const stripExt = (name: string) => name.replace(/\.[^.]+$/, '') || 'ascii';

  const handleExport = useCallback(async () => {
    if (!activeAsset || exportProgress !== null) return;
    const base = stripExt(activeAsset.name);
    setExportError(null);
    if (activeAsset.type === 'image') {
      imageRef.current?.exportPNG(`${base}_ascii.png`);
      return;
    }
    setExportProgress(0);
    try {
      await videoRef.current?.exportMP4(`${base}_ascii.mp4`, (f) => setExportProgress(f));
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExportProgress(null);
    }
  }, [activeAsset, exportProgress]);

  const sidebarContent = (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-sm font-semibold font-mono text-foreground tracking-tight">
          Purrscii
        </h1>
        <div className="flex items-center gap-2">
          <AmbientToggle on={ambientOn} onToggle={() => setAmbientOn((v) => !v)} />
          <ThemeToggle />
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Collapse panel"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-[11px] font-semibold tracking-widest text-muted-foreground/70 uppercase mb-2">
          Source
        </h3>
        <Button
          variant="outline"
          className="w-full justify-center text-xs h-8"
          onClick={handleFileSelect}
        >
          <Upload className="h-3 w-3 mr-1.5" />
          Upload Media
        </Button>
        {hasAssets && (
          <p className="text-[11px] text-muted-foreground/60 mt-1.5 text-center">
            {assets.length}/{MAX_ASSETS} slots
          </p>
        )}
        {activeAsset && !compareMode && (
          <Button
            variant="outline"
            className="w-full justify-center text-xs h-8 mt-2"
            onClick={handleExport}
            disabled={exportProgress !== null}
          >
            {exportProgress !== null ? (
              <>
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                Encoding {Math.round(exportProgress * 100)}%
              </>
            ) : (
              <>
                <Download className="h-3 w-3 mr-1.5" />
                {activeAsset.type === 'image' ? 'Export PNG' : 'Export MP4'}
              </>
            )}
          </Button>
        )}
        {activeAsset?.type === 'video' && !compareMode && exportProgress === null && (
          <p className="text-[10px] text-muted-foreground/50 mt-1 text-center leading-tight">
            Video only, no audio
          </p>
        )}
        {exportError && (
          <p className="text-[10px] text-destructive mt-1 text-center leading-tight">
            {exportError}
          </p>
        )}
      </div>

      <AudioControls
        hasAudio={Boolean(audio.url)}
        name={audio.name}
        isPlaying={audio.isPlaying}
        volume={audio.volume}
        onUpload={handleAudioUpload}
        onTogglePlay={audio.togglePlay}
        onVolumeChange={audio.setVolume}
        onRemove={audio.clear}
      />

      <div className="flex-1 overflow-y-auto px-4 py-2 sidebar-scroll">
        {activeAsset ? (
          <>
            {compareMode && (
              <div className="mb-3 px-2 py-1.5 bg-muted/50 rounded text-xs text-muted-foreground">
                Editing: <span className="text-foreground font-medium">{activeAsset.name}</span>
              </div>
            )}
            <ControlPanel
              settings={activeAsset.settings}
              onSettingsChange={(newSettings) => updateAssetSettings(activeAsset.id, newSettings)}
              showPlaybackSpeed={hasVideoAsset}
            />
          </>
        ) : (
          <p className="text-xs text-muted-foreground/60 text-center mt-6">
            Upload media to start
          </p>
        )}
      </div>

      <AmbientPrompt
        visible={!ambientOn && !ambientPromptDismissed}
        onWake={() => setAmbientOn(true)}
        onDismiss={() => setAmbientPromptDismissed(true)}
      />

      {hasAssets && (
        <div className="flex justify-end pointer-events-none">
          <div className="h-28 w-28">
            <video
              src="/cat_sleep.mp4"
              autoPlay
              muted
              playsInline
              onEnded={(e) => {
                const v = e.currentTarget;
                setTimeout(() => {
                  if (!v.isConnected) return;
                  v.currentTime = 0;
                  v.play().catch(() => {});
                }, 3000 + Math.random() * 3000);
              }}
              className="h-full w-full object-contain mix-blend-multiply dark:hidden"
              style={{ filter: 'contrast(1.8)' }}
            />
            <video
              src="/cat_sleepdark.mp4"
              autoPlay
              muted
              playsInline
              onEnded={(e) => {
                const v = e.currentTarget;
                setTimeout(() => {
                  if (!v.isConnected) return;
                  v.currentTime = 0;
                  v.play().catch(() => {});
                }, 3000 + Math.random() * 3000);
              }}
              className="h-full w-full object-contain hidden dark:block"
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen flex overflow-hidden">
      <audio
        ref={audio.audioRef}
        src={audio.url ?? undefined}
        loop
        autoPlay
        onPlay={() => audio.setIsPlaying(true)}
        onPause={() => audio.setIsPlaying(false)}
        className="hidden"
      />
      <LandingAmbient enabled={ambientOn} />
      <main
        className="flex-1 bg-preview-bg flex flex-col min-w-0 relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {hasAssets ? (
          <>
            <div className="flex-1 min-h-0">
              {compareMode ? (
                compareAssets.length > 0 ? (
                  <CompareGrid
                    assets={compareAssets}
                    onSelectAsset={setActiveAsset}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-preview-foreground/40 text-sm">Select assets to compare</p>
                  </div>
                )
              ) : activeAsset ? (
                <div className="w-full h-full p-4">
                  {activeAsset.type === 'image' ? (
                    <ASCIIImage ref={imageRef} imageUrl={activeAsset.url} settings={activeAsset.settings} />
                  ) : (
                    <ASCIIVideo ref={videoRef} videoUrl={activeAsset.url} settings={activeAsset.settings} />
                  )}
                </div>
              ) : null}
            </div>

            <AssetThumbnailStrip
              assets={assets}
              activeAssetId={activeAssetId}
              compareMode={compareMode}
              selectedForCompare={selectedForCompare}
              onSelectAsset={setActiveAsset}
              onRemoveAsset={removeAsset}
              onToggleCompare={toggleCompareMode}
              onToggleAssetForCompare={toggleAssetForCompare}
              onReorderAssets={reorderAssets}
            />
          </>
        ) : (
          <>
            <AmbientField enabled={ambientOn} rain={rainParams} dust={dustParams} />
            {ambientOn && tunerEnabled && (
              <AmbientTuner
                rain={rainParams}
                dust={dustParams}
                onRainChange={setRainParams}
                onDustChange={setDustParams}
                onReset={() => { setRainParams(DEFAULT_RAIN); setDustParams(DEFAULT_DUST); }}
              />
            )}
            <button
              type="button"
              onClick={handleFileSelect}
              className="relative flex-1 flex items-center justify-center cursor-pointer text-preview-foreground/40 hover:text-preview-foreground/60 transition-colors"
            >
            <div className="flex flex-col items-center gap-4">
              <video
                src="/cat_load1.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="h-44 w-44 object-contain mix-blend-multiply dark:hidden"
                style={{ filter: 'contrast(1.8)' }}
              />
              <video
                src="/cat_loaddark.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="h-44 w-44 object-contain mix-blend-screen hidden dark:block"
                style={{ filter: 'contrast(1.8)' }}
              />
              <div className="text-center">
                <p className="text-sm font-medium font-mono">
                  <Scramble text="Turn the world into words." durationMs={700} />
                </p>
                <motion.p
                  className="text-xs mt-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.75, duration: 0.3 }}
                >
                  Drop an image or video to begin
                </motion.p>
                <motion.p
                  className="text-xs"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.95, duration: 0.3 }}
                >
                  or click to open the void
                  <motion.span
                    className="inline-block ml-0.5 align-baseline"
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear', times: [0.5, 0.5] }}
                  >
                    ▮
                  </motion.span>
                </motion.p>
              </div>
            </div>
          </button>
          </>
        )}

        {isDraggingOver && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-preview-bg/80 backdrop-blur-sm border-2 border-dashed border-preview-foreground/40 pointer-events-none">
            <div className="flex flex-col items-center gap-3 text-preview-foreground">
              <Upload className="h-12 w-12 stroke-1" />
              <p className="text-sm font-medium">Drop to upload</p>
            </div>
          </div>
        )}

        <div className="lg:hidden absolute top-4 right-4 z-10">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-preview-foreground/60 hover:text-preview-foreground hover:bg-preview-foreground/10"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              {sidebarContent}
            </SheetContent>
          </Sheet>
        </div>
      </main>

      <aside
        className={cn(
          'hidden lg:flex flex-col bg-background border-l border-border flex-shrink-0 transition-all duration-300',
          sidebarCollapsed ? 'w-12' : 'w-80'
        )}
      >
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center py-3 gap-2">
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Expand panel"
            >
              <PanelRightOpen className="h-4 w-4" />
            </button>
            <button
              onClick={handleFileSelect}
              className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Upload media"
            >
              <Upload className="h-4 w-4" />
            </button>
            <ThemeToggle className="p-2" />
          </div>
        ) : (
          sidebarContent
        )}
      </aside>
    </div>
  );
}
