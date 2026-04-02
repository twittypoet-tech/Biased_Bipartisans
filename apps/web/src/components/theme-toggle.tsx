'use client'

import { useTheme } from './theme-provider'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      className={`rounded-lg p-2 transition hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 ${className ?? ''}`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="size-4 text-neutral-400" />
      ) : (
        <Moon className="size-4 text-neutral-600" />
      )}
    </button>
  )
}
