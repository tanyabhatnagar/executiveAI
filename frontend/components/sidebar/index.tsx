'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Layers, 
  History, 
  Settings, 
  Coins, 
  LogOut, 
  Terminal 
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/dashboard', icon: FolderOpen }, // Projects listing is on Dashboard
    { name: 'Templates', href: '/dashboard', icon: Layers }, // Templates trigger modal in dashboard
    { name: 'History', href: '/dashboard', icon: History },
    { name: 'Settings', href: '/dashboard', icon: Settings },
  ];

  const getIsActive = (href: string, itemName: string) => {
    if (itemName === 'Projects' && pathname.includes('/projects/')) {
      return true;
    }
    return pathname === href && itemName !== 'Projects';
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 border-r border-[#262626] bg-[#0A0A0A] flex flex-col justify-between p-5 select-none font-sans">
      <div className="flex flex-col gap-8">
        {/* Brand Logo Header */}
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#262626] bg-[#111111]">
            <Terminal className="h-4 w-4 text-[#FAFAFA]" />
          </div>
          <span className="text-base font-bold tracking-tight text-[#FAFAFA]">
            Execute<span className="text-[#A1A1AA] font-normal">AI</span>
          </span>
        </Link>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = getIsActive(item.href, item.name);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition duration-150 ${
                  isActive
                    ? 'bg-[#111111] text-[#FAFAFA] border border-[#262626]'
                    : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#111111]/50 border border-transparent'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-[#FAFAFA]' : 'text-[#A1A1AA]'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Credits and User Profile Section */}
      <div className="flex flex-col gap-4">
        {/* Credits usage panel */}
        {user && (
          <div className="bg-[#111111] border border-[#262626] rounded-xl p-4 flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#A1A1AA] flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-[#2563EB]" /> Credits Remaining
            </span>
            <div className="flex items-end justify-between mt-1">
              <span className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-mono">{user.credits}</span>
              <span className="text-[10px] text-[#A1A1AA]">of 50 runs</span>
            </div>
            <div className="h-1 w-full bg-[#262626] rounded-full overflow-hidden mt-1">
              <div 
                className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
                style={{ width: `${(user.credits / 50) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Profile Footer */}
        {user && (
          <div className="border-t border-[#262626] pt-4 flex items-center justify-between">
            <div className="flex items-center gap-3 truncate">
              {/* Initials Avatar */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#262626] bg-[#111111] text-xs font-bold text-[#FAFAFA]">
                {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-[#FAFAFA] truncate">{user.full_name}</span>
                <span className="text-[10px] text-[#A1A1AA] font-mono truncate">{user.email}</span>
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="p-2 text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#111111] rounded-lg transition duration-150 cursor-pointer"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
