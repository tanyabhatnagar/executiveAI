'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '../../types';
import { FolderGit } from 'lucide-react';

interface ProjectTableProps {
  projects: Project[];
  loading: boolean;
}

export default function ProjectTable({ projects, loading }: ProjectTableProps) {
  const router = useRouter();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Running':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-900/30 bg-blue-950/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
            <span className="h-1 w-1 rounded-full bg-blue-400" />
            Running
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-900/30 bg-emerald-950/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            <span className="h-1 w-1 rounded-full bg-emerald-400" />
            Completed
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-905/30 bg-red-950/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">
            <span className="h-1 w-1 rounded-full bg-red-400" />
            Failed
          </span>
        );
      case 'Draft':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#262626] bg-[#111111] px-2 py-0.5 text-[10px] font-semibold text-[#A1A1AA]">
            <span className="h-1 w-1 rounded-full bg-[#A1A1AA]" />
            Draft
          </span>
        );
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    // Premium Skeleton Table Loader
    return (
      <div className="w-full overflow-hidden rounded-xl border border-[#262626] bg-[#111111]">
        <div className="p-4 border-b border-[#262626] bg-[#0A0A0A] flex gap-4">
          <div className="h-3 w-32 animate-skeleton rounded" />
          <div className="h-3 w-64 animate-skeleton rounded" />
        </div>
        <div className="divide-y divide-[#262626]/40 p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center py-2">
              <div className="space-y-2">
                <div className="h-3.5 w-40 animate-skeleton rounded" />
                <div className="h-3 w-80 animate-skeleton rounded" />
              </div>
              <div className="h-6 w-16 animate-skeleton rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="w-full rounded-xl border border-[#262626] bg-[#111111] py-16 px-4 text-center">
        <FolderGit className="mx-auto h-8 w-8 text-[#A1A1AA]/50 mb-3" />
        <h3 className="text-sm font-semibold text-[#FAFAFA]">No projects found</h3>
        <p className="text-xs text-[#A1A1AA] mt-1 max-w-xs mx-auto">
          Get started by defining your first workflow goal.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-[#262626] bg-[#111111]/30 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse font-sans">
          <thead>
            <tr className="border-b border-[#262626] bg-[#111111]/60 text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
              <th className="py-3.5 px-5">Project Name</th>
              <th className="py-3.5 px-5">Goal Description</th>
              <th className="py-3.5 px-5">Status</th>
              <th className="py-3.5 px-5 text-right">Created At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262626]/60 text-sm text-[#A1A1AA] font-medium">
            {projects.map((project) => (
              <tr 
                key={project.id} 
                className="hover:bg-[#111111]/40 hover:text-[#FAFAFA] transition duration-150 group cursor-pointer"
                onClick={() => router.push(`/projects/${project.id}/blueprint`)}
              >
                <td className="py-4 px-5 font-semibold text-[#FAFAFA] group-hover:text-white">
                  {project.name}
                </td>
                <td className="py-4 px-5 text-xs text-[#A1A1AA] max-w-xs truncate">
                  {project.goal}
                </td>
                <td className="py-4 px-5">
                  {getStatusBadge(project.status)}
                </td>
                <td className="py-4 px-5 text-right text-xs text-[#A1A1AA]/60 group-hover:text-[#FAFAFA]/80 font-mono">
                  {formatDate(project.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
