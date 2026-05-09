'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { motion, useSpring, useTransform } from 'motion/react';

import { cn } from '@/lib/utils';

interface FilledBarSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  segments?: number;
  formatValue?: (n: number) => string;
  onChange: (n: number) => void;
  className?: string;
  disabled?: boolean;
}

export function FilledBarSlider({
  label,
  value,
  min,
  max,
  step = 1,
  segments = 6,
  formatValue,
  onChange,
  className,
  disabled,
}: FilledBarSliderProps) {
  const [displayValue, setDisplayValue] = React.useState(value);
  const [isDragging, setIsDragging] = React.useState(false);

  // Sync from parent only when the user isn't actively dragging.
  React.useEffect(() => {
    if (!isDragging) setDisplayValue(value);
  }, [value, isDragging]);

  const display = formatValue ? formatValue(displayValue) : String(displayValue);
  const pct = ((displayValue - min) / (max - min)) * 100;

  // Spring physics smooth the visual position toward the target — same
  // approach as the Switch, so dragging, releasing, and clicking all feel
  // consistent. Slight underdamping gives a small overshoot on commit.
  const pctSpring = useSpring(pct, { stiffness: 380, damping: 28, mass: 0.9 });

  React.useEffect(() => {
    pctSpring.set(pct);
  }, [pct, pctSpring]);

  const widthStyle = useTransform(pctSpring, (v) => `${v}%`);
  const indicatorLeft = useTransform(pctSpring, (v) => `calc(${v}% - 1px)`);

  const handlePointerDown = () => setIsDragging(true);

  const handleValueChange = ([v]: number[]) => {
    setDisplayValue(v);
  };

  const handleValueCommit = ([v]: number[]) => {
    setIsDragging(false);
    onChange(v);
  };

  return (
    <SliderPrimitive.Root
      value={[displayValue]}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onValueChange={handleValueChange}
      onValueCommit={handleValueCommit}
      onPointerDown={handlePointerDown}
      className={cn(
        'group relative flex w-full touch-none select-none items-center',
        'cursor-pointer active:cursor-grabbing',
        'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        className,
      )}
    >
      <SliderPrimitive.Track
        className={cn(
          'relative h-9 w-full overflow-hidden rounded-md bg-muted/50',
          'transition-colors group-hover:bg-muted/70',
          'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40 has-[:focus-visible]:ring-offset-1 has-[:focus-visible]:ring-offset-background',
        )}
      >
        {/* Spring-driven fill, replaces Radix's SliderPrimitive.Range */}
        <motion.div
          className="absolute left-0 top-0 h-full bg-foreground/15"
          style={{ width: widthStyle }}
          aria-hidden
        />

        {segments > 1 && (
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100 group-has-[:focus-visible]:opacity-100"
            aria-hidden
          >
            {Array.from({ length: segments - 1 }, (_, i) => (
              <span
                key={i}
                className="absolute top-0 bottom-0 w-px bg-foreground/15"
                style={{ left: `${((i + 1) / segments) * 100}%` }}
              />
            ))}
          </div>
        )}

        <motion.div
          className={cn(
            'pointer-events-none absolute inset-y-1 w-0.5 rounded-full bg-foreground/70',
            'opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100 group-has-[:focus-visible]:opacity-100',
          )}
          style={{ left: indicatorLeft }}
          aria-hidden
        />

        <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-3">
          <span className="text-[13px] text-foreground/80">{label}</span>
          <span className="text-[11px] tabular-nums text-muted-foreground">{display}</span>
        </div>
      </SliderPrimitive.Track>

      <SliderPrimitive.Thumb aria-label={label} className="block size-0 opacity-0 outline-none" />
    </SliderPrimitive.Root>
  );
}
