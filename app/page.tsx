'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ControlPanel } from '@/components/ascii/control-panel';
import { ASCIIImage, type ASCIIImageHandle } from '@/components/ascii/ascii-image';
import { ASCIIVideo, type ASCIIVideoHandle } from '@/components/ascii/ascii-video';
import { AssetThumbnailStrip } from '@/components/ascii/asset-thumbnail-strip';
import { CompareGrid } from '@/components/ascii/compare-grid';
import { useAssetManager, MAX_ASSETS } from '@/hooks/use-asset-manager';
import { useBackgroundAudio } from '@/hooks/use-background-audio';
import { AudioControls } from '@/components/ascii/audio-controls';
import { Button } from '@/components/ui/button';
import { Upload, Menu, ImageIcon, PanelRightClose, PanelRightOpen, Download, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = 'image/png,image/jpeg,image/jpg,image/gif,image/webp,video/mp4,video/webm,video/ogg,video/quicktime';

const SCRAMBLE_GLYPHS = '!@#$%^&*()_+-=<>?/\\|[]{}~"\'.;:,1234567890';

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
        <div className="flex items-center gap-1">
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
          <button
            type="button"
            onClick={handleFileSelect}
            className="flex-1 flex items-center justify-center cursor-pointer text-preview-foreground/40 hover:text-preview-foreground/60 transition-colors"
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
