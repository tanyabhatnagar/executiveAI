'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Project } from '../../types';
import AppLayout from '../../components/app-layout';
import MetricCard from '../../components/project-card';
import ProjectTable from '../../components/project-table';
import { 
  FolderGit, 
  Play, 
  CheckCircle2, 
  Plus, 
  X, 
  Coins, 
  Search,
  Sparkles,
  Rocket,
  ShieldCheck,
  BookOpen,
  Users,
  TrendingUp
} from 'lucide-react';
import { TEMPLATES } from '../../config/templates';
import Toast, { ToastMessage } from '../../components/toast';

const TEMPLATE_ICONS: Record<string, any> = {
  'startup-launch': Rocket,
  'product-validation': ShieldCheck,
  'learning-roadmap': BookOpen,
  'interview-prep': Users,
  'marketing-campaign': TrendingUp,
};

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, loading, user, fetchProfile } = useAuth();
  const queryClient = useQueryClient();

  // Hero Input state
  const [heroGoalInput, setHeroGoalInput] = useState('');

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectGoal, setProjectGoal] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Draft' | 'Running' | 'Completed'>('All');

  // Toasts State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, text, type }]);
  };
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  // React Query fetch projects
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects'),
    enabled: isAuthenticated,
  });

  // React Query mutation to create project
  const createProjectMutation = useMutation({
    mutationFn: (newProject: { name: string; goal: string }) =>
      api.post<Project>('/projects', newProject),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setProjectName('');
      setProjectGoal('');
      setHeroGoalInput('');
      setIsModalOpen(false);
      showToast('Workflow created successfully!', 'success');
      fetchProfile();
      router.push(`/projects/${data.id}/blueprint`);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create workflow. Please try again.');
      showToast(err.message || 'Failed to create workflow.', 'error');
    },
  });

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroGoalInput.trim()) {
      showToast('Please enter a goal description first.', 'error');
      return;
    }
    // Populate modal with hero values and open modal
    setProjectGoal(heroGoalInput);
    // Extrapolate a simple name
    const defaultName = heroGoalInput.split(' ').slice(0, 3).join(' ') + ' App';
    setProjectName(defaultName.replace(/[^\w\s]/g, ''));
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCreateProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!projectName.trim() || !projectGoal.trim()) {
      setFormError('Please enter both project name and goal description.');
      return;
    }

    createProjectMutation.mutate({
      name: projectName,
      goal: projectGoal,
    });
  };

  // Perform global search on client side (Feature 4)
  const filteredProjects = projects.filter(project => {
    if (statusFilter !== 'All' && project.status !== statusFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = project.name.toLowerCase().includes(q);
      const goalMatch = project.goal.toLowerCase().includes(q);
      const statusMatch = project.status.toLowerCase().includes(q);
      
      const dateStr = new Date(project.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).toLowerCase();
      const dateMatch = dateStr.includes(q);

      return nameMatch || goalMatch || statusMatch || dateMatch;
    }

    return true;
  });

  // Calculate metrics
  const totalProjects = projects.length;
  const activeWorkflows = projects.filter((p) => p.status === 'Running').length;
  const completedWorkflows = projects.filter((p) => p.status === 'Completed').length;
  const executionsRemaining = user?.credits ?? 0;

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="h-5 w-5 animate-spin rounded-full border border-[#262626] border-t-transparent" />
      </div>
    );
  }

  return (
    <AppLayout>
      {/* Hero Workspace Section */}
      <div className="max-w-3xl mx-auto text-center mt-6 mb-16 space-y-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#FAFAFA]">
          What would you like AI to accomplish today?
        </h1>
        <p className="text-sm text-[#A1A1AA] max-w-lg mx-auto">
          Specify your goal and ExecuteAI will generate blueprint specifications, coordinate specialized agents, and self-validate deliverables.
        </p>

        {/* Large Goal Input Bar */}
        <form onSubmit={handleHeroSubmit} className="relative mt-8 flex items-center gap-3">
          <input
            type="text"
            placeholder="e.g. Plan a digital marketing campaign targeting college freshman students..."
            value={heroGoalInput}
            onChange={(e) => setHeroGoalInput(e.target.value)}
            className="w-full bg-[#111111] border border-[#262626] rounded-xl px-5 py-4 text-sm text-[#FAFAFA] placeholder-[#A1A1AA]/40 focus:outline-none focus:border-[#2563EB]/80 focus:ring-1 focus:ring-[#2563EB]/40 transition shadow-sm font-sans"
          />
          <button
            type="submit"
            className="shrink-0 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-semibold text-sm px-6 py-4 rounded-xl shadow transition duration-200 cursor-pointer active:scale-98"
          >
            Create Workflow
          </button>
        </form>
      </div>

      {/* Metrics Section */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-12">
        <MetricCard
          title="Executions Remaining"
          value={executionsRemaining}
          icon={Coins}
          description="Runs left in billing cycle"
          colorClass="text-blue-500"
        />
        <MetricCard
          title="Total Projects"
          value={totalProjects}
          icon={FolderGit}
          description="Active and draft projects"
          colorClass="text-[#A1A1AA]"
        />
        <MetricCard
          title="Active Workflows"
          value={activeWorkflows}
          icon={Play}
          description="Engines currently running"
          colorClass="text-[#2563EB]"
        />
        <MetricCard
          title="Completed Workflows"
          value={completedWorkflows}
          icon={CheckCircle2}
          description="Self-validated deliverables"
          colorClass="text-emerald-500"
        />
      </div>

      {/* Recent Projects Header and Filters */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center pb-3 border-b border-[#262626]">
          <h2 className="text-lg font-bold tracking-tight text-[#FAFAFA]">
            Recent Projects
          </h2>

          {/* Search bar and subtle tab list */}
          <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto items-center">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#111111] border border-[#262626] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#FAFAFA] placeholder-[#A1A1AA]/30 focus:outline-none focus:border-[#333333] transition"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#A1A1AA]/40" />
            </div>

            <div className="flex gap-1 shrink-0 bg-[#111111] border border-[#262626] p-0.5 rounded-lg">
              {(['All', 'Draft', 'Running', 'Completed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold tracking-tight transition cursor-pointer ${
                    statusFilter === status
                      ? 'bg-[#0A0A0A] text-[#FAFAFA] border border-[#262626]'
                      : 'text-[#A1A1AA] hover:text-[#FAFAFA]/80 border border-transparent'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Project Table */}
        <ProjectTable projects={filteredProjects} loading={isLoading} />
      </div>

      {/* Project Customization Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity duration-200">
          <div className="relative w-full max-w-lg rounded-xl border border-[#262626] bg-[#111111] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Close */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-[#A1A1AA] hover:bg-[#262626] hover:text-[#FAFAFA] transition duration-150 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Title */}
            <div className="mb-5">
              <h3 className="text-base font-bold text-[#FAFAFA] tracking-tight">
                Create New Project
              </h3>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Refine the goal parameters for your AI work orchestration setup.
              </p>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-950/20 border border-red-900/30 rounded-lg text-xs text-red-400">
                {formError}
              </div>
            )}

            {/* Suggested Templates List */}
            <div className="mb-5">
              <span className="block text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">
                Suggested Templates
              </span>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((tpl) => {
                  const Icon = TEMPLATE_ICONS[tpl.id] || Sparkles;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        setProjectName(tpl.name);
                        setProjectGoal(tpl.goal);
                      }}
                      className="flex items-center gap-2 p-2 rounded-lg border border-[#262626] bg-[#0A0A0A]/50 hover:bg-[#0A0A0A] text-left transition cursor-pointer group"
                    >
                      <div className="bg-[#111111] border border-[#262626] p-1.5 rounded-md text-[#A1A1AA] group-hover:text-[#2563EB] transition">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="text-[10px] font-bold text-[#FAFAFA] truncate">{tpl.name}</div>
                        <div className="text-[8px] text-[#A1A1AA] truncate mt-0.5">{tpl.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleCreateProjectSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3.5 py-2 text-xs text-[#FAFAFA] placeholder-[#A1A1AA]/30 focus:outline-none focus:border-[#2563EB]/80 focus:ring-1 focus:ring-[#2563EB]/40 transition"
                  placeholder="e.g. Startup Launch Roadmap"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                  Goal Description
                </label>
                <textarea
                  value={projectGoal}
                  onChange={(e) => setProjectGoal(e.target.value)}
                  rows={4}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3.5 py-2.5 text-xs text-[#FAFAFA] placeholder-[#A1A1AA]/30 focus:outline-none focus:border-[#2563EB]/80 focus:ring-1 focus:ring-[#2563EB]/40 transition resize-none leading-relaxed"
                  placeholder="Describe your exact goal specifications..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-[#262626] hover:bg-[#262626] px-4 py-2 text-xs font-semibold text-[#A1A1AA] hover:text-[#FAFAFA] transition duration-150 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProjectMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] hover:bg-[#2563EB]/90 text-white px-4 py-2 text-xs font-bold transition duration-150 disabled:opacity-50 cursor-pointer"
                >
                  {createProjectMutation.isPending ? (
                    <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                  ) : (
                    <span>Create Workflow</span>
                  )}
                </button>
              </div>
            </form>
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
