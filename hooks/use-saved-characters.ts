'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'ascii-playground-saved-chars';

export interface SavedCharset {
  id: string;
  name: string;
  chars: string;
  createdAt: number;
}

export function useSavedCharacters() {
  const [savedCharsets, setSavedCharsets] = useState<SavedCharset[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedCharsets(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load saved characters:', e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever savedCharsets changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedCharsets));
      } catch (e) {
        console.error('Failed to save characters:', e);
      }
    }
  }, [savedCharsets, isLoaded]);

  const saveCharset = useCallback((name: string, chars: string) => {
    const newCharset: SavedCharset = {
      id: `custom-${Date.now()}`,
      name: name.trim() || `Custom ${savedCharsets.length + 1}`,
      chars,
      createdAt: Date.now(),
    };
    setSavedCharsets(prev => [...prev, newCharset]);
    return newCharset;
  }, [savedCharsets.length]);

  const deleteCharset = useCallback((id: string) => {
    setSavedCharsets(prev => prev.filter(c => c.id !== id));
  }, []);

  const renameCharset = useCallback((id: string, newName: string) => {
    setSavedCharsets(prev => 
      prev.map(c => c.id === id ? { ...c, name: newName.trim() || c.name } : c)
    );
  }, []);

  return {
    savedCharsets,
    saveCharset,
    deleteCharset,
    renameCharset,
    isLoaded,
  };
}
