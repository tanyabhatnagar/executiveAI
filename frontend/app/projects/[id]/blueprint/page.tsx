'use client';

import React, { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Project } from '@/types';
import AppLayout from '@/components/app-layout';
import { 
  ArrowLeft, 
  Cpu, 
  Sparkles, 
  CheckSquare, 
  Square, 
  Play, 
  CheckCircle2, 
  Zap, 
  Calendar, 
  Compass, 
  Layers,
  Loader2,
  FileText,
  AlertTriangle,
  Trash2,
  PlusCircle,
  Check,
  Circle,
  HelpCircle,
  Clock
} from 'lucide-react';
import Toast, { ToastMessage } from '@/components/toast';

interface Agent {
  id: string;
  name: string;
  responsibility: string;
  status: string;
}

interface Deliverable {
  id: string;
  name: string;
}

interface Blueprint {
  id: string;
  project_id: string;
  category: string;
  domain: string;
  complexity: 'Low' | 'Medium' | 'High';
  estimated_steps: number;
  created_at: string;
  deliverables: Deliverable[];
  agents: Agent[];
}

interface Execution {
  id: string;
  project_id: string;
  status: 'Pending' | 'Running' | 'Completed' | 'Failed';
  started_at: string;
  completed_at: string | null;
  current_agent: string | null;
  progress_percentage: number;
  error_log: string | null;
}

export default function BlueprintPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Local state for deliverables checklist
  const [checkedDeliverables, setCheckedDeliverables] = useState<Record<string, boolean>>({});

  // Blueprint Editing State
  const [isEditingBlueprint, setIsEditingBlueprint] = useState(false);
  const [editCategory, setEditCategory] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [editComplexity, setEditComplexity] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [editEstimatedSteps, setEditEstimatedSteps] = useState(4);
  const [editDeliverables, setEditDeliverables] = useState<{ id?: string; name: string }[]>([]);
  const [editAgents, setEditAgents] = useState<{ id?: string; name: string; responsibility: string }[]>([]);

  // Toasts State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const { fetchProfile } = useAuth();
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, text, type }]);
  };
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Query: Fetch Project Details
  const { data: project, isLoading: isProjectLoading } = useQuery<Project>({
    queryKey: ['project', projectId],
    queryFn: () => api.get<Project>(`/projects/${projectId}`),
    enabled: isAuthenticated,
  });

  // Query: Fetch Blueprint Details
  const { 
    data: blueprint, 
    isLoading: isBlueprintLoading, 
    error: blueprintError 
  } = useQuery<Blueprint>({
    queryKey: ['blueprint', projectId],
    queryFn: () => api.get<Blueprint>(`/projects/${projectId}/blueprint`),
    enabled: isAuthenticated,
    retry: false,
  });

  // Sync editing state when blueprint loads
  useEffect(() => {
    if (blueprint) {
      setEditCategory(blueprint.category);
      setEditDomain(blueprint.domain);
      setEditComplexity(blueprint.complexity);
      setEditEstimatedSteps(blueprint.estimated_steps);
      setEditDeliverables(blueprint.deliverables.map(d => ({ id: d.id, name: d.name })));
      setEditAgents(blueprint.agents.map(a => ({ id: a.id, name: a.name, responsibility: a.responsibility })));
    }
  }, [blueprint]);

  // Query: Fetch Workflow Execution Status
  const { 
    data: execution,
    refetch: refetchExecution
  } = useQuery<Execution>({
    queryKey: ['executionStatus', projectId],
    queryFn: () => api.get<Execution>(`/projects/${projectId}/execution/status`),
    enabled: isAuthenticated,
    retry: false,
  });

  // Poll execution status if active (Pending or Running)
  useEffect(() => {
    if (!execution) return;
    if (execution.status === 'Running' || execution.status === 'Pending') {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['executionStatus', projectId] });
      }, 3000);
      return () => clearInterval(interval);
    } else if (execution.status === 'Completed') {
      // Invalidate execution results cache so that results page fetches fresh outputs
      queryClient.invalidateQueries({ queryKey: ['executionResults', projectId] });
      fetchProfile();
    }
  }, [execution, projectId, queryClient, fetchProfile]);

  // Mutation: Trigger Blueprint Generation
  const generateBlueprintMutation = useMutation({
    mutationFn: () => api.post<Blueprint>(`/projects/${projectId}/blueprint/generate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blueprint', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      showToast('AI Blueprint generated successfully!', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Blueprint generation failed.', 'error');
    }
  });

  // Mutation: Trigger Workflow Execution
  const executeWorkflowMutation = useMutation({
    mutationFn: () => api.post<Execution>(`/projects/${projectId}/execute`, {}),
    onSuccess: (data) => {
      queryClient.setQueryData(['executionStatus', projectId], data);
      queryClient.invalidateQueries({ queryKey: ['executionStatus', projectId] });
      // Invalidate old execution results immediately on execution start
      queryClient.invalidateQueries({ queryKey: ['executionResults', projectId] });
      showToast('Workflow execution pipeline started!', 'success');
      fetchProfile();
    },
    onError: (err: any) => {
      showToast(err.message || 'Workflow execution failed to start.', 'error');
    }
  });

  // Mutation: Save Blueprint Updates
  const saveBlueprintMutation = useMutation({
    mutationFn: (updatedData: any) => 
      api.put<Blueprint>(`/projects/${projectId}/blueprint`, updatedData),
    onSuccess: (data) => {
      queryClient.setQueryData(['blueprint', projectId], data);
      queryClient.invalidateQueries({ queryKey: ['blueprint', projectId] });
      setIsEditingBlueprint(false);
      showToast('AI Blueprint updated successfully!', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to update blueprint.', 'error');
    }
  });

  const handleSaveBlueprint = () => {
    if (!editCategory.trim() || !editDomain.trim()) {
      showToast('Category and Domain are required.', 'error');
      return;
    }
    if (editDeliverables.length === 0) {
      showToast('At least one deliverable is required.', 'error');
      return;
    }
    if (editAgents.length === 0) {
      showToast('At least one agent is required.', 'error');
      return;
    }
    if (editDeliverables.some(d => !d.name.trim())) {
      showToast('Deliverable names cannot be empty.', 'error');
      return;
    }
    if (editAgents.some(a => !a.name.trim() || !a.responsibility.trim())) {
      showToast('Agent names and responsibilities cannot be empty.', 'error');
      return;
    }

    saveBlueprintMutation.mutate({
      category: editCategory,
      domain: editDomain,
      complexity: editComplexity,
      estimated_steps: editEstimatedSteps,
      deliverables: editDeliverables,
      agents: editAgents
    });
  };

  const handleCancelEdit = () => {
    if (blueprint) {
      setEditCategory(blueprint.category);
      setEditDomain(blueprint.domain);
      setEditComplexity(blueprint.complexity);
      setEditEstimatedSteps(blueprint.estimated_steps);
      setEditDeliverables(blueprint.deliverables.map(d => ({ id: d.id, name: d.name })));
      setEditAgents(blueprint.agents.map(a => ({ id: a.id, name: a.name, responsibility: a.responsibility })));
    }
    setIsEditingBlueprint(false);
  };

  const addEditDeliverable = () => {
    setEditDeliverables(prev => [...prev, { name: '' }]);
  };

  const removeEditDeliverable = (index: number) => {
    setEditDeliverables(prev => prev.filter((_, i) => i !== index));
  };

  const addEditAgent = () => {
    setEditAgents(prev => [...prev, { name: '', responsibility: '' }]);
  };

  const removeEditAgent = (index: number) => {
    setEditAgents(prev => prev.filter((_, i) => i !== index));
  };

  const updateEditDeliverable = (index: number, name: string) => {
    setEditDeliverables(prev => prev.map((d, i) => i === index ? { ...d, name } : d));
  };

  const updateEditAgent = (index: number, field: 'name' | 'responsibility', value: string) => {
    setEditAgents(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a));
  };

  const handleGenerateClick = () => {
    generateBlueprintMutation.mutate();
  };

  const handleExecuteClick = () => {
    executeWorkflowMutation.mutate();
  };

  const toggleDeliverable = (id: string) => {
    setCheckedDeliverables(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'High':
        return 'bg-red-950/20 border-red-900/30 text-red-400';
      case 'Medium':
        return 'bg-amber-950/20 border-amber-900/30 text-amber-400';
      case 'Low':
      default:
        return 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400';
    }
  };

  const getAgentExecutionStatus = (agentName: string) => {
    if (!execution) return 'Pending';
    if (execution.status === 'Completed') return 'Completed';
    if (execution.status === 'Failed') return 'Failed';

    const agentNames = blueprint?.agents.map(a => a.name) || [];
    const currentAgent = execution.current_agent;

    if (agentName === currentAgent) return 'Running';

    const currentIdx = agentNames.indexOf(currentAgent || '');
    const agentIdx = agentNames.indexOf(agentName);

    if (agentIdx < currentIdx && currentIdx !== -1) return 'Completed';
    return 'Pending';
  };

  // UI state variables
  const isGenerating = generateBlueprintMutation.isPending;
  const isStartingExecution = executeWorkflowMutation.isPending;
  const blueprintDoesNotExist = blueprintError && !isBlueprintLoading;
  const isLoading = authLoading || isProjectLoading || (isBlueprintLoading && !blueprintDoesNotExist);

  // Check if a workflow is actively running in background
  const isExecutionRunning = execution && (execution.status === 'Running' || execution.status === 'Pending');

  if (isLoading) {
    // Premium Skeleton Loader workspace
    return (
      <AppLayout>
        <div className="mb-6 h-4 w-32 animate-skeleton rounded" />
        <div className="flex justify-between items-center pb-6 border-b border-[#262626] mb-8">
          <div className="space-y-2.5">
            <div className="h-8 w-64 animate-skeleton rounded" />
            <div className="h-4 w-48 animate-skeleton rounded" />
          </div>
          <div className="h-9 w-32 animate-skeleton rounded-lg" />
        </div>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-1 space-y-6">
            <div className="h-32 animate-skeleton rounded-xl border border-[#262626]" />
            <div className="h-48 animate-skeleton rounded-xl border border-[#262626]" />
          </div>
          <div className="col-span-2 space-y-6">
            <div className="h-48 animate-skeleton rounded-xl border border-[#262626]" />
            <div className="h-64 animate-skeleton rounded-xl border border-[#262626]" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="flex-1 flex flex-col justify-center items-center py-20 text-center">
          <HelpCircle className="h-8 w-8 text-[#A1A1AA]/50 mb-3" />
          <h2 className="text-sm font-bold text-[#FAFAFA]">Project Not Found</h2>
          <p className="text-xs text-[#A1A1AA] mt-1">The project you are trying to view does not exist or you lack permission.</p>
          <Link href="/dashboard" className="mt-6 flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Back Link */}
      <div className="mb-6">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A1A1AA] hover:text-[#FAFAFA] transition duration-150"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Header Title Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#262626] mb-8 font-sans">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">
            {project.name}
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-1.5">
            AI Planning Workspace & Orchestration Blueprint
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {blueprint && !isExecutionRunning && (
            <>
              {!isEditingBlueprint ? (
                <>
                  <button
                    onClick={() => setIsEditingBlueprint(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#262626] bg-[#111111] hover:bg-[#262626] px-4.5 py-2 text-xs font-bold text-[#FAFAFA] transition duration-200 cursor-pointer shadow-sm"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#2563EB]" />
                    <span>Edit Blueprint</span>
                  </button>

                  <button
                    onClick={handleGenerateClick}
                    disabled={isGenerating || isStartingExecution}
                    className="flex items-center gap-1.5 rounded-lg border border-[#262626] bg-[#111111] hover:bg-[#262626] px-4 py-2 text-xs font-bold text-[#A1A1AA] hover:text-[#FAFAFA] transition duration-200 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#2563EB]" />
                    <span>Regenerate Blueprint</span>
                  </button>

                  {execution?.status === 'Completed' ? (
                    <Link
                      href={`/projects/${projectId}/results`}
                      className="flex items-center gap-1.5 rounded-lg bg-[#111111] border border-[#262626] hover:bg-[#262626] px-4 py-2 text-xs font-bold text-[#FAFAFA] transition duration-200 cursor-pointer shadow-sm"
                    >
                      <FileText className="h-3.5 w-3.5 text-emerald-500" />
                      <span>View Results</span>
                    </Link>
                  ) : null}

                  <button
                    onClick={handleExecuteClick}
                    disabled={isGenerating || isStartingExecution}
                    className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] hover:bg-[#2563EB]/95 text-white px-4 py-2 text-xs font-bold transition duration-200 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isStartingExecution ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5 fill-white text-white" />
                    )}
                    <span>Execute Workflow</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="rounded-lg border border-[#262626] hover:bg-[#262626] px-4 py-2 text-xs font-semibold text-[#A1A1AA] hover:text-[#FAFAFA] transition duration-150 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveBlueprint}
                    disabled={saveBlueprintMutation.isPending}
                    className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] hover:bg-[#2563EB]/90 text-white px-4 py-2 text-xs font-bold tracking-tight transition duration-200 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {saveBlueprintMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5 text-white" />
                    )}
                    <span>Save Blueprint</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* CASE A: No Blueprint Exists - CTA Panel */}
      {blueprintDoesNotExist && !blueprint && (
        <div className="mx-auto max-w-xl rounded-xl border border-[#262626] bg-[#111111]/30 p-8 text-center shadow-sm backdrop-blur-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-[#262626] bg-[#111111] mb-5">
            <Cpu className="h-5 w-5 text-[#A1A1AA]" />
          </div>
          <h2 className="text-base font-bold text-[#FAFAFA] tracking-tight">
            Planning Engine Offline
          </h2>
          <p className="text-xs text-[#A1A1AA] mt-2 max-w-sm mx-auto leading-relaxed">
            Generate an execution blueprint detailing target domains, deliverables, and specialized orchestration agents.
          </p>

          <div className="mt-6 p-3.5 bg-[#111111] border border-[#262626] rounded-lg text-left text-xs font-sans mb-6">
            <span className="font-bold text-[#A1A1AA]/80 uppercase tracking-wider block text-[9px] mb-1">Project Goal</span>
            <p className="text-[#FAFAFA] italic">"{project.goal}"</p>
          </div>

          <button
            onClick={handleGenerateClick}
            disabled={isGenerating}
            className="mx-auto flex items-center gap-2 rounded-lg bg-[#2563EB] hover:bg-[#2563EB]/95 text-white px-5 py-2.5 text-xs font-bold transition duration-200 cursor-pointer shadow active:scale-98"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <Sparkles className="h-4 w-4 text-white" />
            )}
            <span>Generate AI Blueprint</span>
          </button>
        </div>
      )}

      {/* CASE B: Premium Execution Timeline Panel */}
      {isExecutionRunning && blueprint && (
        <div className="mx-auto max-w-lg rounded-xl border border-[#262626] bg-[#111111]/50 p-6 shadow-sm mb-10 font-sans">
          <div className="flex items-center justify-between mb-5">
            <div>
              <span className="block text-[9px] font-bold text-[#A1A1AA] uppercase tracking-wider font-mono">Workflow orchestration</span>
              <h3 className="text-sm font-bold text-[#FAFAFA] mt-1">Executing Plan Sequences</h3>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-900/30 bg-blue-955/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Running ({execution.progress_percentage}%)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-1.5 w-full bg-[#262626] rounded-full overflow-hidden mb-6">
            <div 
              className="h-full bg-[#2563EB] rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${execution.progress_percentage}%` }}
            />
          </div>

          {/* Vertical Execution Timeline */}
          <div className="space-y-5 relative pl-4 border-l border-[#262626] ml-2.5">
            {/* Goal Analysis & Blueprint generation (always completed if we are running) */}
            <div className="relative">
              {/* Check Circle Bullet */}
              <div className="absolute -left-[23px] top-0 bg-[#0A0A0A] p-0.5 rounded-full border border-emerald-900/50 text-emerald-400">
                <Check className="h-3.5 w-3.5" />
              </div>
              <div className="pl-2">
                <span className="text-xs font-semibold text-[#FAFAFA]">Goal Analysis</span>
                <p className="text-[10px] text-[#A1A1AA]/80 mt-0.5">Categorized project parameters and goal structure.</p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-[23px] top-0 bg-[#0A0A0A] p-0.5 rounded-full border border-emerald-900/50 text-emerald-400">
                <Check className="h-3.5 w-3.5" />
              </div>
              <div className="pl-2">
                <span className="text-xs font-semibold text-[#FAFAFA]">Blueprint Generation</span>
                <p className="text-[10px] text-[#A1A1AA]/80 mt-0.5">Orchestrated 4 target deliverables and agent mapping.</p>
              </div>
            </div>

            {/* Dynamic agents pipeline */}
            {blueprint.agents.map((agent) => {
              const agentStatus = getAgentExecutionStatus(agent.name);
              return (
                <div key={agent.id} className="relative">
                  {/* Status Bullet */}
                  <div className={`absolute -left-[23px] top-0.5 bg-[#0A0A0A] p-0.5 rounded-full ${
                    agentStatus === 'Completed'
                      ? 'border-emerald-900/50 text-emerald-400'
                      : agentStatus === 'Running'
                        ? 'border-blue-900/50 text-blue-400'
                        : 'border-[#262626] text-[#A1A1AA]/40'
                  }`}>
                    {agentStatus === 'Completed' && <Check className="h-3.5 w-3.5" />}
                    {agentStatus === 'Running' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {agentStatus === 'Pending' && <Circle className="h-3.5 w-3.5 fill-[#111111]" />}
                  </div>
                  
                  <div className="pl-2">
                    <span className={`text-xs font-semibold ${
                      agentStatus === 'Running' ? 'text-blue-400' : 'text-[#FAFAFA]'
                    }`}>
                      {agent.name}
                    </span>
                    <p className="text-[10px] text-[#A1A1AA]/80 mt-0.5 leading-relaxed">{agent.responsibility}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Execution Time Estimator Footer */}
          <div className="mt-6 pt-4 border-t border-[#262626] flex items-center justify-between text-[10px] text-[#A1A1AA] font-mono">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#A1A1AA]/60" /> Estimated time remaining
            </span>
            <span className="font-semibold text-[#FAFAFA]">~2m remaining</span>
          </div>
        </div>
      )}

      {/* CASE C: Execution Failed Panel */}
      {execution?.status === 'Failed' && !isExecutionRunning && blueprint && (
        <div className="mx-auto max-w-lg rounded-xl border border-red-955/30 bg-red-950/5 p-5 shadow-sm mb-10">
          <div className="flex items-start gap-3.5">
            <div className="rounded-lg border border-red-900/30 bg-red-950/10 p-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-[#FAFAFA]">Execution Failed</h3>
              <p className="text-xs text-[#A1A1AA] mt-1">An error occurred during workflow agent execution:</p>
              <div className="mt-3 p-3 bg-[#0A0A0A] border border-red-900/20 rounded-lg text-[10px] font-mono text-red-400 max-h-24 overflow-y-auto leading-relaxed">
                {execution.error_log || 'Unknown pipeline execution failure.'}
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleExecuteClick}
                  className="flex items-center gap-1 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white px-3.5 py-1.5 text-xs font-bold rounded-lg transition"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Retry Execution
                </button>
                <Link
                  href={`/projects/${projectId}/results`}
                  className="flex items-center gap-1.5 rounded-lg border border-[#262626] bg-[#111111] hover:bg-[#262626] px-3.5 py-1.5 text-xs font-bold text-[#FAFAFA] transition"
                >
                  View Partial Outputs
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CASE D: Blueprint Workspace (Default View / Edit View) */}
      {!isExecutionRunning && blueprint && (
        isEditingBlueprint ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-in fade-in duration-200">
            
            {/* Left Column: Summary & Metadata */}
            <div className="lg:col-span-1 space-y-6">
              {/* Goal Summary */}
              <div className="rounded-xl border border-[#262626] bg-[#111111] p-5 shadow-sm">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-2.5">
                  Project Goal
                </h3>
                <p className="text-xs text-[#FAFAFA] leading-relaxed font-mono italic">
                  "{project.goal}"
                </p>
              </div>

              {/* Blueprint Meta Data Inputs */}
              <div className="rounded-xl border border-[#262626] bg-[#111111] p-5 shadow-sm space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                  Edit Planning Analysis
                </h3>

                {/* Category */}
                <div className="space-y-1 pb-1">
                  <span className="text-[10px] text-[#A1A1AA] font-semibold flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" /> Category
                  </span>
                  <input 
                    type="text" 
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-2.5 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#333333] transition"
                  />
                </div>

                {/* Domain */}
                <div className="space-y-1 pb-1">
                  <span className="text-[10px] text-[#A1A1AA] font-semibold flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5" /> Domain
                  </span>
                  <input 
                    type="text" 
                    value={editDomain}
                    onChange={(e) => setEditDomain(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-2.5 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#333333] transition"
                  />
                </div>

                {/* Complexity */}
                <div className="space-y-1 pb-1">
                  <span className="text-[10px] text-[#A1A1AA] font-semibold flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" /> Complexity
                  </span>
                  <select
                    value={editComplexity}
                    onChange={(e) => setEditComplexity(e.target.value as any)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-2.5 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#333333] transition"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                {/* Estimated Steps */}
                <div className="space-y-1">
                  <span className="text-[10px] text-[#A1A1AA] font-semibold flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Estimated Steps
                  </span>
                  <input 
                    type="number" 
                    value={editEstimatedSteps}
                    onChange={(e) => setEditEstimatedSteps(parseInt(e.target.value) || 1)}
                    min={1}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-2.5 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#333333] transition font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Right Columns: Deliverables & Agents */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Deliverables Checklist Section */}
              <div className="rounded-xl border border-[#262626] bg-[#111111] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="text-xs font-bold text-[#FAFAFA] flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#A1A1AA]" />
                    <span>Edit Deliverables</span>
                  </h3>
                  <button
                    type="button"
                    onClick={addEditDeliverable}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#A1A1AA] hover:text-[#FAFAFA] transition cursor-pointer"
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-emerald-500" /> Add Deliverable
                  </button>
                </div>

                <div className="space-y-2">
                  {editDeliverables.map((deliv, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-[#A1A1AA]/50 w-4">{idx + 1}.</span>
                      <input
                        type="text"
                        value={deliv.name}
                        onChange={(e) => updateEditDeliverable(idx, e.target.value)}
                        className="flex-1 bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#333333] transition"
                      />
                      <button
                        type="button"
                        onClick={() => removeEditDeliverable(idx)}
                        className="p-1.5 text-[#A1A1AA] hover:text-red-400 hover:bg-[#0A0A0A] rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Generated Agents Grid */}
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="text-xs font-bold text-[#FAFAFA] flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-[#A1A1AA]" />
                    <span>Edit AI Agents</span>
                  </h3>
                  <button
                    type="button"
                    onClick={addEditAgent}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#A1A1AA] hover:text-[#FAFAFA] transition cursor-pointer"
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-emerald-500" /> Add Agent
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {editAgents.map((agent, idx) => (
                    <div 
                      key={idx} 
                      className="rounded-xl border border-[#262626] bg-[#111111] p-4 flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-wider">Agent Name</label>
                          <button
                            type="button"
                            onClick={() => removeEditAgent(idx)}
                            className="text-[#A1A1AA] hover:text-red-400 hover:bg-[#0A0A0A] p-1 rounded transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        
                        <input
                          type="text"
                          value={agent.name}
                          onChange={(e) => updateEditAgent(idx, 'name', e.target.value)}
                          className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#FAFAFA] focus:outline-none focus:border-[#333333] transition"
                        />

                        <label className="block text-[9px] font-bold text-[#A1A1AA] uppercase tracking-wider">Responsibility</label>
                        <textarea
                          value={agent.responsibility}
                          onChange={(e) => updateEditAgent(idx, 'responsibility', e.target.value)}
                          rows={3}
                          className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-2.5 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#333333] transition resize-none leading-relaxed"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-in fade-in duration-200">
            
            {/* Left Column: Summary & Metadata */}
            <div className="lg:col-span-1 space-y-6">
              {/* Goal Summary */}
              <div className="rounded-xl border border-[#262626] bg-[#111111] p-5 shadow-sm">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-2.5">
                  Project Goal
                </h3>
                <p className="text-xs text-[#FAFAFA] leading-relaxed font-mono italic">
                  "{project.goal}"
                </p>
              </div>

              {/* Blueprint Meta Data */}
              <div className="rounded-xl border border-[#262626] bg-[#111111] p-5 shadow-sm space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                  Planning Analysis
                </h3>

                {/* Category */}
                <div className="flex items-center justify-between py-1.5 border-b border-[#262626]/40">
                  <span className="text-xs text-[#A1A1AA] font-semibold flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" /> Category
                  </span>
                  <span className="text-xs text-[#FAFAFA] font-bold">{blueprint.category}</span>
                </div>

                {/* Domain */}
                <div className="flex items-center justify-between py-1.5 border-b border-[#262626]/40">
                  <span className="text-xs text-[#A1A1AA] font-semibold flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5" /> Domain
                  </span>
                  <span className="text-xs text-[#FAFAFA] font-bold">{blueprint.domain}</span>
                </div>

                {/* Complexity */}
                <div className="flex items-center justify-between py-1.5 border-b border-[#262626]/40">
                  <span className="text-xs text-[#A1A1AA] font-semibold flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" /> Complexity
                  </span>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${getComplexityColor(blueprint.complexity)}`}>
                    {blueprint.complexity}
                  </span>
                </div>

                {/* Estimated Steps */}
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-[#A1A1AA] font-semibold flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Estimated Steps
                  </span>
                  <span className="text-xs text-[#FAFAFA] font-mono font-bold">{blueprint.estimated_steps} Steps</span>
                </div>
              </div>
            </div>

            {/* Right Columns: Deliverables & Agents */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Deliverables Checklist Section */}
              <div className="rounded-xl border border-[#262626] bg-[#111111] p-5 shadow-sm">
                <h3 className="text-xs font-bold text-[#FAFAFA] mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#A1A1AA]" />
                  <span>Expected Deliverables</span>
                </h3>

                <div className="divide-y divide-[#262626]/40">
                  {blueprint.deliverables.map((deliv) => {
                    const isChecked = !!checkedDeliverables[deliv.id];
                    return (
                      <div 
                        key={deliv.id} 
                        onClick={() => toggleDeliverable(deliv.id)}
                        className="flex items-center gap-3 py-3 cursor-pointer group"
                      >
                        {isChecked ? (
                          <CheckSquare className="h-4.5 w-4.5 text-[#FAFAFA]/70 transition duration-150" />
                        ) : (
                          <Square className="h-4.5 w-4.5 text-[#A1A1AA]/40 group-hover:text-[#A1A1AA] transition duration-150" />
                        )}
                        <span className={`text-xs select-none font-medium transition duration-150 ${
                          isChecked ? 'text-[#A1A1AA] line-through' : 'text-[#FAFAFA] group-hover:text-white'
                        }`}>
                          {deliv.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Generated Agents Pills / Cards */}
              <div>
                <h3 className="text-xs font-bold text-[#FAFAFA] mb-3.5 flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-[#A1A1AA]" />
                  <span>Orchestrated AI Agents</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {blueprint.agents.map((agent) => (
                    <div 
                      key={agent.id} 
                      className="rounded-xl border border-[#262626] bg-[#111111] p-4 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#FAFAFA]">
                            {agent.name}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#0A0A0A] border border-[#262626] px-2 py-0.5 text-[9px] font-mono text-[#A1A1AA]">
                            <span className="h-1 w-1 rounded-full bg-[#A1A1AA]/50" />
                            {agent.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                          {agent.responsibility}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )
      )}

      {/* Global Processing Loader Overlay for Blueprint Synthesis */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="w-full max-w-xs text-center space-y-4 font-sans">
            <div className="relative mx-auto h-12 w-12 items-center justify-center rounded-lg border border-[#262626] bg-[#111111] flex">
              <Sparkles className="h-5 w-5 text-[#2563EB] animate-spin duration-3000" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#FAFAFA] tracking-tight">
                Synthesizing Workspace Blueprint
              </h3>
              <p className="text-[10px] text-[#A1A1AA] leading-relaxed">
                Gemini LLM is configuring workflow context and agent profiles...
              </p>
            </div>

            <div className="h-1 w-full bg-[#262626] rounded-full overflow-hidden">
              <div className="h-full bg-[#2563EB] rounded-full animate-infinite-loading" />
            </div>
            
            <span className="block text-[8px] font-semibold text-[#A1A1AA]/50 uppercase tracking-widest font-mono">
              Planning Phase
            </span>
          </div>
        </div>
      )}

      {/* Toasts Container */}
      <div className="fixed bottom-5 right-5 z-55 flex flex-col gap-2.5">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast} onClose={removeToast} />
        ))}
      </div>
    </AppLayout>
  );
}
