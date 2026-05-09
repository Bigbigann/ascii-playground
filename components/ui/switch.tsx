'use client'

import * as React from 'react'
import { motion } from 'motion/react'

import { cn } from '@/lib/utils'

interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value'> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

function Switch({
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  ...props
}: SwitchProps) {
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked ?? false)
  const isControlled = checked !== undefined
  const isOn = isControlled ? checked : internalChecked

  const toggle = () => {
    if (disabled) return
    const next = !isOn
    if (!isControlled) setInternalChecked(next)
    onCheckedChange?.(next)
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      data-slot="switch"
      data-state={isOn ? 'checked' : 'unchecked'}
      disabled={disabled}
      onClick={toggle}
      className={cn(
        'peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-5 w-12 shrink-0 items-center px-1 rounded-full shadow-xs transition-colors duration-300 outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <motion.span
        data-slot="switch-thumb"
        data-state={isOn ? 'checked' : 'unchecked'}
        className="bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block h-3 w-5 rounded-full ring-0 shadow-sm"
        animate={{ x: isOn ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      />
    </button>
  )
}

export { Switch }
