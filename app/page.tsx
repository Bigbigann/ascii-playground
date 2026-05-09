'use client';

import { useCallback, useRef, useState } from 'react';
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
        <h1 className="text-sm font-semibold text-foreground tracking-tight">
          ASCII Playground
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
          className="w-full justify-center text-xs h-8 border-dashed"
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
              <ImageIcon className="h-16 w-16 stroke-1" />
              <div className="text-center">
                <p className="text-sm font-medium">Drop an image or video here</p>
                <p className="text-xs mt-1">or click to browse</p>
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
