'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  title?: string;
}

export function ThemeToggle({ className, title }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === 'dark' : true;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const next = isDark ? 'light' : 'dark';
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> };
    };

    if (!doc.startViewTransition) {
      setTheme(next);
      return;
    }

    const root = document.documentElement;
    root.style.setProperty('--theme-x', `${e.clientX}px`);
    root.style.setProperty('--theme-y', `${e.clientY}px`);
    doc.startViewTransition(() => setTheme(next));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground',
        className,
      )}
      title={title ?? `Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
