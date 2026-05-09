'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { frameToASCII, calculateFontSize } from '@/lib/ascii/converter';
import type { ASCIISettings } from '@/lib/ascii/presets';

interface ASCIICanvasProps {
  videoUrl: string;
  settings: ASCIISettings;
  isPlaying: boolean;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onPlayStateChange: (isPlaying: boolean) => void;
}

export function ASCIICanvas({
  videoUrl,
  settings,
  isPlaying,
  currentTime,
  onTimeUpdate,
  onDurationChange,
  onPlayStateChange,
}: ASCIICanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const [asciiLines, setAsciiLines] = useState<string[]>([]);
  const [fontSize, setFontSize] = useState(12);

  // Initialize offscreen canvas
  useEffect(() => {
    offscreenCanvasRef.current = document.createElement('canvas');
  }, []);

  // Handle video metadata
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      onDurationChange(video.duration);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [onDurationChange]);

  // Handle playback speed
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = settings.playbackSpeed;
    }
  }, [settings.playbackSpeed]);

  // Handle play/pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => {
        onPlayStateChange(false);
      });
    } else {
      video.pause();
    }
  }, [isPlaying, onPlayStateChange]);

  // Handle seeking
  useEffect(() => {
    const video = videoRef.current;
    if (video && Math.abs(video.currentTime - currentTime) > 0.5) {
      video.currentTime = currentTime;
    }
  }, [currentTime]);

  // Process video frame to ASCII
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const offscreen = offscreenCanvasRef.current;
    const container = containerRef.current;
    
    if (!video || !offscreen || !container || video.readyState < 2) return;

    const ctx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    offscreen.width = video.videoWidth;
    offscreen.height = video.videoHeight;

    ctx.drawImage(video, 0, 0);

    const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);

    const lines = frameToASCII(imageData, settings, settings.resolution);
    setAsciiLines(lines);

    const containerRect = container.getBoundingClientRect();
    const newFontSize = calculateFontSize(
      containerRect.width,
      containerRect.height,
      lines[0]?.length || settings.resolution,
      lines.length
    );
    setFontSize(newFontSize);

    onTimeUpdate(video.currentTime);
  }, [settings, onTimeUpdate]);

  // Animation loop
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const animate = () => {
      processFrame();
      animationRef.current = requestAnimationFrame(animate);
    };

    const handleCanPlay = () => {
      animate();
    };

    video.addEventListener('canplay', handleCanPlay);
    
    if (video.readyState >= 2) {
      animate();
    }

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [processFrame]);

  // Handle video end
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      onPlayStateChange(false);
    };

    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, [onPlayStateChange]);

  return (
    <div className="relative w-full h-full">
      {/* Hidden video element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="hidden"
        playsInline
        muted
        crossOrigin="anonymous"
      />

      {/* ASCII display */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden"
      >
        <pre
          className="font-mono leading-none text-preview-foreground select-none whitespace-pre"
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: '1em',
          }}
        >
          {asciiLines.join('\n')}
        </pre>
      </div>

      {/* Hidden canvas for rendering (used for export later) */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
