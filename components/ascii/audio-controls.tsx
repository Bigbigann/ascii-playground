'use client';

import { Music, Pause, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilledBarSlider } from '@/components/ui/filled-bar-slider';

interface AudioControlsProps {
  hasAudio: boolean;
  name: string;
  isPlaying: boolean;
  volume: number;
  onUpload: () => void;
  onTogglePlay: () => void;
  onVolumeChange: (n: number) => void;
  onRemove: () => void;
}

export function AudioControls({
  hasAudio,
  name,
  isPlaying,
  volume,
  onUpload,
  onTogglePlay,
  onVolumeChange,
  onRemove,
}: AudioControlsProps) {
  return (
    <div className="px-4 py-3 border-b border-border space-y-2">
      <h3 className="text-[11px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
        Audio
      </h3>

      {!hasAudio ? (
        <Button
          variant="outline"
          className="w-full justify-center text-xs h-8 border-dashed"
          onClick={onUpload}
        >
          <Music className="h-3 w-3 mr-1.5" />
          Upload Audio
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePlay}
              className="h-7 w-7 shrink-0 rounded-md bg-muted/60 hover:bg-muted text-foreground flex items-center justify-center transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <span className="text-[11px] text-foreground/70 truncate flex-1" title={name}>
              {name}
            </span>
            <button
              type="button"
              onClick={onRemove}
              className="text-muted-foreground/60 hover:text-foreground p-1 transition-colors"
              title="Remove audio"
              aria-label="Remove audio"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <FilledBarSlider
            label="Volume"
            value={volume}
            min={0}
            max={100}
            step={5}
            formatValue={(n) => `${n}%`}
            onChange={onVolumeChange}
          />
        </div>
      )}
    </div>
  );
}
