'use client'

import { useTheme } from './ThemeProvider'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:bg-slate-100 dark:hover:bg-slate-700"
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'dark'
        ? <Sun size={17} className="text-yellow-400" />
        : <Moon size={17} className="text-slate-500" />
      }
    </button>
  )
}