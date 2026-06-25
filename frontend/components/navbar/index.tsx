'use client';

import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, Terminal } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 shadow-inner">
              <Terminal className="h-4.5 w-4.5 text-zinc-100 animate-pulse" />
            </div>
            <span className="text-sm font-bold tracking-tight text-zinc-100">
              Prompt<span className="text-zinc-400 font-medium">OS</span>
            </span>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping ml-0.5" />
          </div>

          {/* User Section & Logout */}
          {user && (
            <div className="flex items-center gap-4">
              <div className="flex flex-col text-right hidden sm:flex">
                <span className="text-xs font-semibold text-zinc-200">{user.full_name}</span>
                <span className="text-[10px] text-zinc-500 font-mono">{user.email}</span>
              </div>
              <div className="h-8 w-px bg-zinc-800 hidden sm:block" />
              <button
                onClick={() => logout()}
                className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition duration-150 cursor-pointer shadow-sm"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
