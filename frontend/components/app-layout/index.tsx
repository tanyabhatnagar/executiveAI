'use client';

import React from 'react';
import Sidebar from '../sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex font-sans antialiased">
      {/* Docked Left Navigation Sidebar */}
      <Sidebar />

      {/* Scrollable Main Application Content Block */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        <main className="flex-1 w-full mx-auto max-w-7xl px-8 sm:px-10 py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
