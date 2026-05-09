'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useBackgroundAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);

  // Push volume into the element when it or the source changes
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume, url]);

  // Revoke the object URL on unmount
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  const load = useCallback((file: File) => {
    setUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setName(file.name);
  }, []);

  const togglePlay = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      try {
        await a.play();
      } catch {
        // autoplay/policy block — surface as paused
      }
    } else {
      a.pause();
    }
  }, []);

  const clear = useCallback(() => {
    audioRef.current?.pause();
    setUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setName('');
    setIsPlaying(false);
  }, []);

  return {
    audioRef,
    url,
    name,
    isPlaying,
    volume,
    setIsPlaying,
    setVolume,
    load,
    togglePlay,
    clear,
  };
}
