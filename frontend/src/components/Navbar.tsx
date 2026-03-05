'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, Zap, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <nav className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-card/50 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <Shield className="text-accent-blue w-8 h-8" />
        <span className="text-xl font-bold tracking-tight text-foreground">API <span className="text-accent-blue">CORTEX</span></span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex bg-background/50 rounded-full p-1 border border-white/10">
          <button
            onClick={() => setTheme('light')}
            className={`p-2 rounded-full transition-all ${theme === 'light' ? 'bg-accent-blue text-white shadow-lg' : 'text-gray-400 hover:text-foreground'}`}
            title="Light Mode"
          >
            <Sun size={18} />
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`p-2 rounded-full transition-all ${theme === 'dark' ? 'bg-accent-purple text-white shadow-lg' : 'text-gray-400 hover:text-foreground'}`}
            title="Dark Mode"
          >
            <Moon size={18} />
          </button>
          <button
            onClick={() => setTheme('cyber')}
            className={`p-2 rounded-full transition-all ${theme === 'cyber' ? 'bg-yellow-500 text-black shadow-lg animate-pulse' : 'text-gray-400 hover:text-foreground'}`}
            title="Cyber Mode"
          >
            <Zap size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}
