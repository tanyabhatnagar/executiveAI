'use client';

import React, { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Project } from '@/types';
import AppLayout from '@/components/app-layout';
import { 
  ArrowLeft, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Database,
  FileText,
  Clock,
  Loader2
} from 'lucide-react';

interface ProjectMemory {
  id: string;
  project_id: string;
  memory_type: string;
  content: string;
  summary: string;
  created_at: string;
}

export default function MemoryTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Track expanded cards
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Query: Fetch Project details
  const { data: project, isLoading: isProjectLoading } = useQuery<Project>({
    queryKey: ['project', projectId],
    queryFn: () => api.get<Project>(`/projects/${projectId}`),
    enabled: isAuthenticated,
  });

  // Query: Fetch Memories
  const { data: memories = [], isLoading: isMemoriesLoading } = useQuery<ProjectMemory[]>({
    queryKey: ['projectMemories', projectId],
    queryFn: () => api.get<ProjectMemory[]>(`/projects/${projectId}/memories`),
    enabled: isAuthenticated,
  });

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isLoading = authLoading || isProjectLoading || isMemoriesLoading;

  if (isLoading) {
    // Premium Skeleton Timeline Loader
    return (
      <AppLayout>
        <div className="mb-6 h-4 w-32 animate-skeleton rounded" />
        <div className="flex justify-between items-center pb-6 border-b border-[#262626] mb-8">
          <div className="space-y-2.5">
            <div className="h-8 w-64 animate-skeleton rounded" />
            <div className="h-4 w-48 animate-skeleton rounded" />
          </div>
          <div className="h-9 w-28 animate-skeleton rounded-lg" />
        </div>
        <div className="space-y-6 max-w-xl">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 animate-skeleton rounded-xl border border-[#262626]" />
          ))}
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="flex-1 flex flex-col justify-center items-center py-20 text-center">
          <Database className="h-8 w-8 text-[#A1A1AA]/50 mb-3" />
          <h2 className="text-sm font-bold text-[#FAFAFA]">Project Not Found</h2>
          <Link href="/dashboard" className="mt-6 flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#262626] pb-6">
        <div>
          <Link 
            href={`/projects/${projectId}/results`} 
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A1A1AA] hover:text-[#FAFAFA] transition duration-150 mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Deliverables Workspace</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">
            Project Memory System
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-1">
            Long-term persistent workspace memory for: "{project.name}"
          </p>
        </div>

        <div className="flex items-center gap-2.5 p-3 rounded-lg border border-[#262626] bg-[#111111] text-[10px] text-[#A1A1AA] font-mono shrink-0">
          <Database className="h-4 w-4 text-[#2563EB]" />
          <div>
            <div className="text-[#A1A1AA] uppercase font-bold text-[8px]">Memory Status</div>
            <div className="text-[#FAFAFA] font-bold mt-0.5">
              {memories.length} entries stored
            </div>
          </div>
        </div>
      </div>

      {/* Timeline representation */}
      {memories.length === 0 ? (
        <div className="rounded-xl border border-[#262626] bg-[#111111]/30 p-12 text-center border-dashed my-10 max-w-xl mx-auto">
          <Clock className="h-8 w-8 text-[#A1A1AA]/30 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#FAFAFA]">No Memory Logs Yet</h3>
          <p className="text-xs text-[#A1A1AA] mt-1 max-w-sm mx-auto leading-relaxed">
            Memories accumulate over time when you run workflow executions and click "Approve" on deliverables.
          </p>
          <Link 
            href={`/projects/${projectId}/blueprint`}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-bold px-4 py-2 text-xs transition duration-150 cursor-pointer"
          >
            Go execute workflow
          </Link>
        </div>
      ) : (
        <div className="relative border-l border-[#262626] pl-6 sm:pl-8 ml-4 sm:ml-6 space-y-8 py-3 max-w-2xl">
          
          {/* Loop memories */}
          {memories.map((mem) => {
            const isExpanded = !!expandedIds[mem.id];
            const dateObj = new Date(mem.created_at);
            const formattedDate = dateObj.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
            const formattedTime = dateObj.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div key={mem.id} className="relative group">
                
                {/* Timeline dot */}
                <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 rounded-lg border border-[#262626] bg-[#0A0A0A] p-1 w-6 h-6 flex items-center justify-center text-[#A1A1AA] shadow-sm group-hover:border-[#333333] transition duration-150">
                  <Database className="h-3 w-3 text-[#2563EB]" />
                </div>

                {/* Card Container */}
                <div className="rounded-xl border border-[#262626] bg-[#111111]/30 hover:border-[#333333] p-5 shadow-sm transition duration-150">
                  
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#262626]/40 mb-3">
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-[#2563EB] bg-[#2563EB]/10 border border-[#2563EB]/20 rounded px-1.5 py-0.5">
                        {mem.memory_type}
                      </span>
                      <h3 className="text-xs font-bold text-[#FAFAFA] mt-2">
                        Workspace Summary
                      </h3>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-[#A1A1AA]/60 text-[9px] font-mono shrink-0">
                      <Calendar className="h-3.5 w-3.5 text-[#A1A1AA]/45" />
                      <span>{formattedDate} at {formattedTime}</span>
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-xs text-[#A1A1AA] leading-relaxed font-sans font-medium">
                    {mem.summary}
                  </p>

                  {/* Action to expand raw context */}
                  <div className="mt-3.5 pt-3 border-t border-[#262626]/40 flex justify-between items-center">
                    <button
                      onClick={() => toggleExpand(mem.id)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA] hover:text-[#FAFAFA] transition cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide Raw Deliverable' : 'Inspect Raw Deliverable'}</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {/* Raw content area */}
                  {isExpanded && (
                    <div className="mt-3.5 p-4 rounded-lg bg-[#0A0A0A] border border-[#262626] text-[10px] font-mono text-[#A1A1AA] overflow-x-auto max-h-[250px] whitespace-pre-wrap leading-relaxed select-text">
                      {mem.content}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
