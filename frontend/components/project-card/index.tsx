'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  description?: string;
  colorClass?: string;
}

export default function MetricCard({ title, value, icon: Icon, description, colorClass = "text-[#A1A1AA]" }: MetricCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#262626] bg-[#111111] p-5 shadow-sm transition duration-200 hover:border-[#333333] font-sans">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">{title}</span>
        <div className={`rounded-lg border border-[#262626] bg-[#0A0A0A] p-2 ${colorClass}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <div className="mt-3">
        <span className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-mono">{value}</span>
      </div>
      {description && (
        <p className="mt-1.5 text-xs text-[#A1A1AA]/70">{description}</p>
      )}
    </div>
  );
}
