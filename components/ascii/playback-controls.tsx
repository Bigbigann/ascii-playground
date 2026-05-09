'use client';

import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onRestart: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function PlaybackControls({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  onRestart,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-preview-bg/80 backdrop-blur-sm">
      {/* Play/Pause */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onPlayPause}
        className="h-8 w-8 text-preview-foreground/80 hover:text-preview-foreground hover:bg-preview-foreground/10"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </Button>

      {/* Restart */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRestart}
        className="h-8 w-8 text-preview-foreground/60 hover:text-preview-foreground hover:bg-preview-foreground/10"
        aria-label="Restart"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>

      {/* Time display */}
      <span className="text-xs text-preview-foreground/60 font-mono tabular-nums min-w-[36px]">
        {formatTime(currentTime)}
      </span>

      {/* Timeline */}
      <Slider
        value={[currentTime]}
        onValueChange={([value]) => onSeek(value)}
        min={0}
        max={duration || 100}
        step={0.1}
        className="flex-1"
      />

      {/* Duration */}
      <span className="text-xs text-preview-foreground/60 font-mono tabular-nums min-w-[36px]">
        {formatTime(duration)}
      </span>
    </div>
  );
}
