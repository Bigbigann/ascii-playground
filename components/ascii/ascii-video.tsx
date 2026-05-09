'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { useTheme } from 'next-themes';
import { frameToColoredASCII, isHexColorLight, type ColoredChar } from '@/lib/ascii/converter';
import { renderASCIIToCanvas } from '@/lib/ascii/render-canvas';
import { exportASCIIVideo } from '@/lib/ascii/video-export';
import type { ASCIISettings } from '@/lib/ascii/presets';

interface ASCIIVideoProps {
  videoUrl: string;
  settings: ASCIISettings;
}

export interface ASCIIVideoHandle {
  exportMP4: (filename: string, onProgress?: (fraction: number) => void) => Promise<void>;
}

export const ASCIIVideo = forwardRef<ASCIIVideoHandle, ASCIIVideoProps>(function ASCIIVideo(
  { videoUrl, settings },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const settingsRef = useRef(settings);
  const { resolvedTheme } = useTheme();
  const themeIsLightRef = useRef(resolvedTheme === 'light');

  // Keep settings ref updated without causing re-renders
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    themeIsLightRef.current = resolvedTheme === 'light';
  }, [resolvedTheme]);

  // Initialize offscreen canvas once
  useEffect(() => {
    offscreenCanvasRef.current = document.createElement('canvas');
    return () => {
      offscreenCanvasRef.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    exportMP4: (filename, onProgress) =>
      exportASCIIVideo({
        videoUrl,
        settings: settingsRef.current,
        themeIsLight: themeIsLightRef.current,
        filename,
        onProgress,
      }),
  }), [videoUrl]);

  // Render ASCII to canvas (much faster than DOM)
  const renderToCanvas = (data: ColoredChar[][], fontSize: number, currentSettings: ASCIISettings) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || data.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const containerRect = container.getBoundingClientRect();
    const targetWidth = Math.floor(containerRect.width * dpr);
    const targetHeight = Math.floor(containerRect.height * dpr);

    if (canvasSizeRef.current.width !== targetWidth || canvasSizeRef.current.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      canvas.style.width = `${containerRect.width}px`;
      canvas.style.height = `${containerRect.height}px`;
      canvasSizeRef.current = { width: targetWidth, height: targetHeight };
    }

    renderASCIIToCanvas(canvas, data, fontSize, currentSettings, {
      width: containerRect.width,
      height: containerRect.height,
      dpr,
    });
  };

  // Animation loop — synced to actual video frames via requestVideoFrameCallback when available.
  useEffect(() => {
    const video = videoRef.current;
    const offscreen = offscreenCanvasRef.current;

    if (!video || !offscreen) return;

    let isRunning = true;
    let offscreenCtx: CanvasRenderingContext2D | null = null;
    let lastSampleWidth = 0;
    let lastSampleHeight = 0;
    let rafHandle: number | null = null;
    let rvfcHandle: number | null = null;

    const supportsRVFC = typeof video.requestVideoFrameCallback === 'function';

    const renderOnce = () => {
      const container = containerRef.current;
      if (!video || !offscreen || !container || video.readyState < 2) return;

      const currentSettings = settingsRef.current;

      // Pre-scale: drawImage the video into a small offscreen canvas roughly
      // sized to the ASCII grid (2× oversampled) before reading pixels. The
      // converter strides through pixels anyway — reading native-res ImageData
      // every frame is the dominant cost in compare mode with multiple tiles.
      const aspect = video.videoHeight / video.videoWidth;
      const sampleWidth = Math.max(8, Math.min(video.videoWidth, currentSettings.resolution * 2));
      const sampleHeight = Math.max(8, Math.round(sampleWidth * aspect));

      if (sampleWidth !== lastSampleWidth || sampleHeight !== lastSampleHeight) {
        offscreen.width = sampleWidth;
        offscreen.height = sampleHeight;
        offscreenCtx = offscreen.getContext('2d', { willReadFrequently: true });
        lastSampleWidth = sampleWidth;
        lastSampleHeight = sampleHeight;
      }
      if (!offscreenCtx) return;

      offscreenCtx.drawImage(video, 0, 0, sampleWidth, sampleHeight);

      const imageData = offscreenCtx.getImageData(0, 0, sampleWidth, sampleHeight);
      const backgroundIsLight = currentSettings.colorMode === 'mono'
        ? isHexColorLight(currentSettings.monoBgColor ?? '#0a0a0a')
        : themeIsLightRef.current;
      const data = frameToColoredASCII(imageData, currentSettings, currentSettings.resolution, backgroundIsLight);

      const containerRect = container.getBoundingClientRect();
      const cols = data[0]?.length || currentSettings.resolution;
      const rows = data.length;
      const fontByWidth = containerRect.width / (cols * 0.6);
      const fontByHeight = containerRect.height / rows;
      const fontSize = Math.max(2, Math.min(fontByWidth, fontByHeight));

      renderToCanvas(data, fontSize, currentSettings);
    };

    const onVideoFrame: VideoFrameRequestCallback = () => {
      if (!isRunning) return;
      renderOnce();
      rvfcHandle = video.requestVideoFrameCallback(onVideoFrame);
    };

    const onAnimationFrame = () => {
      if (!isRunning) return;
      renderOnce();
      rafHandle = requestAnimationFrame(onAnimationFrame);
    };

    const start = () => {
      video.play().catch(() => {});
      if (supportsRVFC) {
        rvfcHandle = video.requestVideoFrameCallback(onVideoFrame);
      } else {
        rafHandle = requestAnimationFrame(onAnimationFrame);
      }
    };

    const handleCanPlay = () => start();
    video.addEventListener('canplay', handleCanPlay);

    if (video.readyState >= 2) start();

    return () => {
      isRunning = false;
      video.removeEventListener('canplay', handleCanPlay);
      if (rafHandle !== null) cancelAnimationFrame(rafHandle);
      if (rvfcHandle !== null && typeof video.cancelVideoFrameCallback === 'function') {
        video.cancelVideoFrameCallback(rvfcHandle);
      }
    };
  }, [videoUrl]);

  // Handle playback speed changes
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = settings.playbackSpeed;
    }
  }, [settings.playbackSpeed]);

  return (
    <div className="relative w-full h-full">
      {/* Hidden video element - autoplay, loop, muted */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="hidden"
        playsInline
        muted
        loop
        autoPlay
      />

      {/* Container for canvas */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full"
        />
      </div>
    </div>
  );
});
