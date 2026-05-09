import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { frameToColoredASCII, isHexColorLight } from './converter';
import { renderASCIIToCanvas, downloadBlob } from './render-canvas';
import type { ASCIISettings } from './presets';

export interface VideoExportOptions {
  videoUrl: string;
  settings: ASCIISettings;
  filename: string;
  // Whether the live preview was rendered against a light theme; affects the
  // brightness ramp inversion when colorMode !== 'mono'.
  themeIsLight: boolean;
  // Frames per second for the output. Defaults to 30.
  fps?: number;
  // Cap on the longest output dimension. Defaults to 1920.
  maxDim?: number;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/**
 * Sample a few decoded video frames via requestVideoFrameCallback to estimate
 * the source frame rate. Falls back to 30fps when rVFC is unavailable or the
 * sample is degenerate. Result is snapped to common rates (24/30/60).
 */
async function detectFps(video: HTMLVideoElement): Promise<number> {
  const rvfc = (video as HTMLVideoElement & {
    requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
  }).requestVideoFrameCallback;
  if (typeof rvfc !== 'function') return 30;

  const samples: number[] = [];
  await new Promise<void>((resolve) => {
    let lastMediaTime = -1;
    let count = 0;
    const cb = (_now: number, meta: { mediaTime: number }) => {
      if (lastMediaTime >= 0) {
        const delta = meta.mediaTime - lastMediaTime;
        if (delta > 0.001) samples.push(delta);
      }
      lastMediaTime = meta.mediaTime;
      count++;
      if (count >= 10) { resolve(); return; }
      rvfc.call(video, cb);
    };
    rvfc.call(video, cb);
    video.play().catch(() => resolve());
    setTimeout(resolve, 1500);
  });
  try { video.pause(); } catch { /* ignore */ }
  video.currentTime = 0;

  if (samples.length === 0) return 30;
  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(samples.length / 2)];
  const fps = 1 / median;
  if (fps >= 58 && fps <= 62) return 60;
  if (fps >= 28 && fps <= 32) return 30;
  if (fps >= 23 && fps <= 25) return 24;
  if (fps >= 49 && fps <= 51) return 50;
  if (fps > 0 && fps < 240) return Math.round(fps);
  return 30;
}

/**
 * Export an ASCII video by seeking through the source frame-by-frame and
 * encoding each rendered ASCII frame with WebCodecs into an MP4 (H.264).
 * No audio in v1.
 */
export async function exportASCIIVideo(opts: VideoExportOptions): Promise<void> {
  if (typeof VideoEncoder === 'undefined') {
    throw new Error('Your browser does not support WebCodecs video export. Try Chrome, Edge, or Atlas.');
  }

  const { videoUrl, settings, filename, themeIsLight, signal } = opts;
  const maxDim = opts.maxDim ?? 1920;
  const onProgress = opts.onProgress ?? (() => {});

  const video = document.createElement('video');
  video.src = videoUrl;
  video.muted = true;
  video.crossOrigin = 'anonymous';
  video.playsInline = true;
  video.preload = 'auto';

  await new Promise<void>((resolve, reject) => {
    const onLoaded = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error('Failed to load source video')); };
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
    };
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('error', onError);
  });

  const srcW = video.videoWidth;
  const srcH = video.videoHeight;
  const duration = video.duration;
  if (!srcW || !srcH || !isFinite(duration)) {
    throw new Error('Invalid source video');
  }

  const fps = opts.fps ?? (await detectFps(video));

  // Compute output dimensions, capped to maxDim, snapped to even (H.264 requires even).
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const outW = Math.max(2, Math.floor((srcW * scale) / 2) * 2);
  const outH = Math.max(2, Math.floor((srcH * scale) / 2) * 2);

  // Sampling canvas — pulls pixels from the video at source resolution.
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = srcW;
  sampleCanvas.height = srcH;
  const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  if (!sampleCtx) throw new Error('Could not create sampling canvas');

  // Output canvas — what we encode.
  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;

  const backgroundIsLight = settings.colorMode === 'mono'
    ? isHexColorLight(settings.monoBgColor ?? '#0a0a0a')
    : themeIsLight;

  // ASCII art is high-frequency content; pick a bitrate that scales with the
  // output pixel rate so glyph edges stay crisp instead of softening.
  // ~0.15 bits per pixel-frame is a reasonable target for sharp text content.
  const bitrate = Math.min(20_000_000, Math.max(2_000_000, Math.round(outW * outH * fps * 0.15)));

  // Pick the first H.264 profile/level the encoder accepts for this size.
  const codecCandidates = ['avc1.640033', 'avc1.640028', 'avc1.4d0028', 'avc1.42E028', 'avc1.42E01F'];
  let chosenCodec: string | null = null;
  for (const codec of codecCandidates) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec, width: outW, height: outH, framerate: fps, bitrate,
      });
      if (support.supported) { chosenCodec = codec; break; }
    } catch { /* try next */ }
  }
  if (!chosenCodec) throw new Error('No supported H.264 encoder configuration for this size');

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width: outW, height: outH },
    fastStart: 'in-memory',
  });

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { throw e; },
  });
  encoder.configure({
    codec: chosenCodec,
    width: outW,
    height: outH,
    framerate: fps,
    bitrate,
  });

  const totalFrames = Math.max(1, Math.floor(duration * fps));
  const frameDurationUs = Math.round(1_000_000 / fps);

  const seekTo = (t: number) => new Promise<void>((resolve, reject) => {
    const onSeeked = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error('Seek failed')); };
    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
    };
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.currentTime = t;
  });

  try {
    for (let i = 0; i < totalFrames; i++) {
      if (signal?.aborted) throw new Error('Export cancelled');

      const t = Math.min(i / fps, Math.max(0, duration - 1e-3));
      await seekTo(t);

      // Sample the video into the sampling canvas, run ASCII conversion, render
      // onto the output canvas, then push a VideoFrame to the encoder.
      sampleCtx.drawImage(video, 0, 0, srcW, srcH);
      const imageData = sampleCtx.getImageData(0, 0, srcW, srcH);
      const data = frameToColoredASCII(imageData, settings, settings.resolution, backgroundIsLight);
      const cols = data[0]?.length || settings.resolution;
      const rows = data.length;
      const fontByWidth = outW / (cols * 0.6);
      const fontByHeight = outH / rows;
      const fontSize = Math.max(2, Math.min(fontByWidth, fontByHeight));

      // Fill bg outside the ASCII area — clearRect produces transparent pixels
      // which encode as black in MP4. Use the theme-appropriate background.
      const ctx = outCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not get output canvas context');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = settings.colorMode === 'mono'
        ? (settings.monoBgColor ?? '#0a0a0a')
        : (themeIsLight ? '#ffffff' : '#0a0a0a');
      ctx.fillRect(0, 0, outW, outH);

      renderASCIIToCanvas(outCanvas, data, fontSize, settings, { width: outW, height: outH });

      const timestamp = i * frameDurationUs;
      const frame = new VideoFrame(outCanvas, { timestamp, duration: frameDurationUs });
      // Force a keyframe roughly every 2 seconds for seekability.
      encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();

      // Backpressure — don't queue too many frames in the encoder.
      while (encoder.encodeQueueSize > 6) {
        await new Promise((r) => setTimeout(r, 0));
      }

      onProgress((i + 1) / totalFrames);
    }

    await encoder.flush();
    muxer.finalize();
    const { buffer } = muxer.target;
    downloadBlob(new Blob([buffer], { type: 'video/mp4' }), filename);
  } finally {
    encoder.close();
    video.removeAttribute('src');
    video.load();
  }
}
