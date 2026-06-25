'use client';

import React, { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Project } from '@/types';
import AppLayout from '@/components/app-layout';
import { 
  ArrowLeft, 
  FileDown, 
  Printer, 
  Copy, 
  Check, 
  CheckCircle2, 
  FileText,
  AlertTriangle,
  History,
  Coins,
  ShieldCheck,
  Edit2,
  RefreshCw,
  HelpCircle,
  Loader2
} from 'lucide-react';
import Toast, { ToastMessage } from '@/components/toast';

interface AgentOutput {
  id: string;
  execution_id: string;
  agent_name: string;
  output: string;
  created_at: string;
  confidence_score: number | null;
  retry_count: number;
  validation_issues: string | null;
}

interface ExecutionDetails {
  execution: {
    id: string;
    project_id: string;
    status: 'Pending' | 'Running' | 'Completed' | 'Failed';
    started_at: string;
    completed_at: string | null;
    current_agent: string | null;
    progress_percentage: number;
    error_log: string | null;
    avg_confidence_score: number;
    total_retries: number;
    validation_failures_count: number;
  };
  outputs: AgentOutput[];
}

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Copy indicator state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Toasts state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, text, type }]);
  };
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Human-in-the-loop UI states
  const [editingAgentName, setEditingAgentName] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');
  const [regeneratingAgentName, setRegeneratingAgentName] = useState<string | null>(null);

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

  // Query: Fetch Execution outputs
  const { data: results, isLoading: isResultsLoading } = useQuery<ExecutionDetails>({
    queryKey: ['executionResults', projectId],
    queryFn: () => api.get<ExecutionDetails>(`/projects/${projectId}/results`),
    enabled: isAuthenticated,
    retry: false,
  });

  // Query: Fetch Approvals logs for this execution
  const { data: approvalsData } = useQuery<any[]>({
    queryKey: ['approvals', projectId, results?.execution?.id],
    queryFn: () => api.get<any[]>(`/projects/${projectId}/execution/${results?.execution?.id}/approvals`),
    enabled: !!results?.execution?.id,
  });

  const approvalsMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    if (approvalsData) {
      approvalsData.forEach(app => {
        if (!map[app.deliverable_name]) {
          map[app.deliverable_name] = app.action;
        }
      });
    }
    return map;
  }, [approvalsData]);

  const handleApprove = async (agentName: string) => {
    if (!results?.execution?.id) return;
    try {
      await api.post(`/projects/${projectId}/execution/${results.execution.id}/approve`, {
        agent_name: agentName
      });
      showToast(`Approved output for ${agentName}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['approvals', projectId, results.execution.id] });
    } catch (err: any) {
      showToast(`Approval failed: ${err.message}`, 'error');
    }
  };

  const handleStartEdit = (agentName: string, output: string) => {
    setEditingAgentName(agentName);
    setEditedContent(output);
  };

  const handleSaveEdit = async (agentName: string) => {
    if (!results?.execution?.id) return;
    try {
      await api.post(`/projects/${projectId}/execution/${results.execution.id}/edit`, {
        agent_name: agentName,
        new_output: editedContent
      });
      setEditingAgentName(null);
      showToast(`Saved output for ${agentName}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['executionResults', projectId] });
      queryClient.invalidateQueries({ queryKey: ['approvals', projectId, results.execution.id] });
    } catch (err: any) {
      showToast(`Save failed: ${err.message}`, 'error');
    }
  };

  const handleRegenerate = async (agentName: string) => {
    if (!results?.execution?.id) return;
    setRegeneratingAgentName(agentName);
    try {
      await api.post(`/projects/${projectId}/execution/${results.execution.id}/regenerate-agent`, {
        agent_name: agentName
      });
      showToast(`Regenerated output for ${agentName}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['executionResults', projectId] });
      queryClient.invalidateQueries({ queryKey: ['approvals', projectId, results.execution.id] });
    } catch (err: any) {
      showToast(`Regeneration failed: ${err.message}`, 'error');
    } finally {
      setRegeneratingAgentName(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportMarkdown = () => {
    if (!project || !results) return;

    let markdownContent = `# ExecuteAI AI Workspace Deliverables\n\n`;
    markdownContent += `## Project Details\n`;
    markdownContent += `* **Project Name:** ${project.name}\n`;
    markdownContent += `* **Original Goal:** ${project.goal}\n`;
    markdownContent += `* **Execution Timestamp:** ${new Date(results.execution.started_at).toLocaleString()}\n`;
    markdownContent += `* **Average Confidence:** ${results.execution.avg_confidence_score || 0}%\n`;
    markdownContent += `* **Total Retries Run:** ${results.execution.total_retries || 0}\n\n`;
    markdownContent += `---\n\n`;

    markdownContent += `## Deliverables & Outputs\n\n`;
    results.outputs.forEach((out) => {
      const isApproved = approvalsMap[out.agent_name] === 'Approve';
      markdownContent += `### ${out.agent_name}\n`;
      markdownContent += `* **Confidence Score:** ${out.confidence_score !== null ? `${out.confidence_score}%` : 'N/A'}\n`;
      markdownContent += `* **Approval Status:** ${isApproved ? 'Approved' : 'Pending Approval'}\n`;
      markdownContent += `* **Retry Count:** ${out.retry_count}\n\n`;
      markdownContent += `#### Output:\n${out.output}\n\n`;
      markdownContent += `* * *\n\n`;
    });

    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${project.name.toLowerCase().replace(/\s+/g, '_')}_workspace_deliverables.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentTableRows: string[][] = [];

    const flushTable = (key: string | number) => {
      if (currentTableRows.length === 0) return;

      const headerRow = currentTableRows[0];
      const bodyRows = currentTableRows.slice(1);

      elements.push(
        <div key={`table-${key}`} className="overflow-x-auto w-full my-4 border border-[#262626] rounded-xl bg-[#0A0A0A] shadow-sm">
          <table className="w-full text-left border-collapse text-xs font-mono text-[#A1A1AA]">
            <thead>
              <tr className="border-b border-[#262626] bg-[#111111]/50">
                {headerRow.map((cell, cidx) => {
                  const isLast = cidx === headerRow.length - 1;
                  const minWidth = isLast ? 'min-w-[250px]' : 'min-w-[120px]';
                  return (
                    <th 
                      key={cidx} 
                      className={`p-3 font-semibold text-[#FAFAFA] border-r border-[#262626] last:border-r-0 ${minWidth}`}
                    >
                      {cell}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ridx) => (
                <tr key={ridx} className="border-b border-[#262626]/40 last:border-b-0 hover:bg-[#111111]/20">
                  {row.map((cell, cidx) => {
                    const isLast = cidx === row.length - 1;
                    const minWidth = isLast ? 'min-w-[250px]' : 'min-w-[120px]';
                    return (
                      <td 
                        key={cidx} 
                        className={`p-3 border-r border-[#262626]/30 last:border-r-0 whitespace-pre-wrap break-words ${minWidth}`}
                      >
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      currentTableRows = [];
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith('|')) {
        let cells = trimmed.split('|').map(c => c.trim());
        if (cells[0] === '') cells.shift();
        if (cells[cells.length - 1] === '') cells.pop();

        // Skip separator row like |---|---|
        const isSeparator = cells.every(c => c.startsWith('---') || c.startsWith(':---') || c.endsWith('---'));
        if (isSeparator) {
          continue;
        }

        currentTableRows.push(cells);
      } else {
        if (currentTableRows.length > 0) {
          flushTable(i);
        }

        if (trimmed.startsWith('### ')) {
          elements.push(<h4 key={i} className="text-xs font-bold text-[#FAFAFA] uppercase tracking-wider mt-4 mb-2">{trimmed.replace('### ', '')}</h4>);
        } else if (trimmed.startsWith('## ')) {
          elements.push(<h3 key={i} className="text-sm font-semibold text-[#FAFAFA] mt-5 mb-2.5">{trimmed.replace('## ', '')}</h3>);
        } else if (trimmed.startsWith('# ')) {
          elements.push(<h2 key={i} className="text-sm font-bold text-[#FAFAFA] mt-6 mb-3 border-b border-[#262626] pb-1">{trimmed.replace('# ', '')}</h2>);
        } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          elements.push(<li key={i} className="text-xs text-[#A1A1AA] ml-4 list-disc mb-1.5 leading-relaxed">{trimmed.replace(/^[\*\-]\s+/, '')}</li>);
        } else if (trimmed.startsWith('> ')) {
          elements.push(<blockquote key={i} className="border-l-2 border-[#262626] pl-3.5 italic text-xs text-[#A1A1AA]/60 my-3">{trimmed.replace('> ', '')}</blockquote>);
        } else if (trimmed === '') {
          elements.push(<div key={i} className="h-2" />);
        } else {
          elements.push(<p key={i} className="text-xs text-[#A1A1AA] leading-relaxed mb-2.5">{trimmed}</p>);
        }
      }
    }

    if (currentTableRows.length > 0) {
      flushTable('end');
    }

    return elements;
  };

  const isLoading = authLoading || isProjectLoading || isResultsLoading;

  if (isLoading) {
    // Premium Skeleton Results Loader
    return (
      <AppLayout>
        <div className="mb-6 h-4 w-32 animate-skeleton rounded" />
        <div className="flex justify-between items-center pb-6 border-b border-[#262626] mb-8">
          <div className="space-y-2.5">
            <div className="h-8 w-64 animate-skeleton rounded" />
            <div className="h-4 w-48 animate-skeleton rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 animate-skeleton rounded-lg" />
            <div className="h-9 w-32 animate-skeleton rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-6">
            <div className="h-96 animate-skeleton rounded-xl border border-[#262626]" />
            <div className="h-96 animate-skeleton rounded-xl border border-[#262626]" />
          </div>
          <div className="col-span-1 space-y-6">
            <div className="h-48 animate-skeleton rounded-xl border border-[#262626]" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!project || !results) {
    return (
      <AppLayout>
        <div className="flex-1 flex flex-col justify-center items-center py-20 text-center">
          <HelpCircle className="h-8 w-8 text-[#A1A1AA]/50 mb-3" />
          <h2 className="text-sm font-bold text-[#FAFAFA]">No Results Found</h2>
          <p className="text-xs text-[#A1A1AA] mt-1">Before viewing results, please launch and execute a project workflow.</p>
          <Link href={`/projects/${projectId}/blueprint`} className="mt-6 flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Go to Blueprint Workspace
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Navigation / Actions Header */}
      <div className="print:hidden mb-6 flex justify-between items-center">
        <Link 
          href={`/projects/${projectId}/blueprint`} 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A1A1AA] hover:text-[#FAFAFA] transition duration-150"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Blueprint Workspace</span>
        </Link>
        
        <div className="flex items-center gap-2">
          <Link 
            href={`/projects/${projectId}/memory`}
            className="flex items-center gap-1.5 rounded-lg border border-[#262626] bg-[#111111] hover:bg-[#262626] px-3.5 py-2 text-xs font-bold text-[#A1A1AA] hover:text-[#FAFAFA] transition duration-150 cursor-pointer"
          >
            <History className="h-3.5 w-3.5 text-[#2563EB]" />
            <span>Memory Timeline</span>
          </Link>
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 rounded-lg border border-[#262626] bg-[#111111] hover:bg-[#262626] px-3.5 py-2 text-xs font-bold text-[#A1A1AA] hover:text-[#FAFAFA] transition duration-150 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={handleExportMarkdown}
            className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] hover:bg-[#2563EB]/95 text-white px-4 py-2 text-xs font-bold transition duration-150 cursor-pointer shadow-sm"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>Export Markdown</span>
          </button>
        </div>
      </div>

      {/* Project Print-Header (Displays only during printing) */}
      <div className="hidden print:block border-b border-[#262626] pb-4 mb-6">
        <h1 className="text-xl font-bold text-black">{project.name}</h1>
        <p className="text-xs text-zinc-500 mt-1">Goal: {project.goal}</p>
        <p className="text-[10px] text-zinc-400 font-mono mt-1">Generated: {new Date(results.execution.started_at).toLocaleString()}</p>
      </div>

      {/* Standard UI Header */}
      <div className="pb-6 border-b border-[#262626] mb-8 print:hidden flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/10 border border-emerald-900/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Execution Completed</span>
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] mt-2.5">
            Deliverables Workspace
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-1">
            Orchestration Results for: "{project.goal}"
          </p>
        </div>
      </div>

      {/* Main Grid: Left Side Metric Stats, Right Side Deliverable Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Overall Metrics & Validation Score Card */}
        <div className="lg:col-span-1 space-y-6 print:hidden">
          
          {/* Quality Audits Overview Card */}
          <div className="rounded-xl border border-[#262626] bg-[#111111] p-5 shadow-sm space-y-5">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
              Audit Execution Details
            </h3>

            {/* Average Confidence */}
            <div className="flex items-center justify-between py-2 border-b border-[#262626]/40">
              <span className="text-xs text-[#A1A1AA] font-semibold flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#2563EB]" /> Confidence Score
              </span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {results.execution.avg_confidence_score || 0}%
              </span>
            </div>

            {/* Auto Repairs */}
            <div className="flex items-center justify-between py-2 border-b border-[#262626]/40">
              <span className="text-xs text-[#A1A1AA] font-semibold flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 text-[#A1A1AA]/60" /> Total Auto-Repairs
              </span>
              <span className="text-xs font-bold text-[#FAFAFA] font-mono">
                {results.execution.total_retries || 0} runs
              </span>
            </div>

            {/* QA Runs */}
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-[#A1A1AA] font-semibold flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[#A1A1AA]/60" /> Total Agent Steps
              </span>
              <span className="text-xs font-bold text-[#FAFAFA] font-mono">
                {results.outputs.length} nodes
              </span>
            </div>
          </div>

          {/* Verification Badge info */}
          <div className="rounded-xl border border-[#262626] bg-[#111111]/30 p-5 text-xs text-[#A1A1AA] space-y-2 leading-relaxed">
            <div className="font-semibold text-[#FAFAFA]">Human-in-the-Loop Controls</div>
            <p>You can edit raw agent outputs directly, request targeted single-agent regeneration, and approve versions to commit them to the semantic timeline memory.</p>
          </div>
        </div>

        {/* Right Columns: Deliverables Work Content Stream */}
        <div className="lg:col-span-2 space-y-6 print:space-y-12">
          {results.outputs.map((out) => {
            const isEditing = editingAgentName === out.agent_name;
            const isRegenerating = regeneratingAgentName === out.agent_name;
            const approvalAction = approvalsMap[out.agent_name];
            
            const score = out.confidence_score;
            let scoreColor = 'border-[#262626] bg-[#111111] text-[#A1A1AA]';
            if (score !== null && score !== undefined) {
              if (score >= 90) scoreColor = 'border-emerald-900/30 bg-emerald-950/10 text-emerald-400';
              else if (score >= 80) scoreColor = 'border-amber-900/30 bg-amber-950/10 text-amber-400';
              else scoreColor = 'border-red-900/30 bg-red-950/10 text-red-400';
            }

            return (
              <div 
                key={out.id}
                className="rounded-xl border border-[#262626] bg-[#111111]/30 p-5 shadow-sm print-card print:border-none print:shadow-none print:p-0"
              >
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262626] pb-3.5 mb-5 print:border-b-2 print:border-zinc-200">
                  <div className="flex items-center gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#FAFAFA] print:text-base print:text-black">
                        {out.agent_name}
                      </h3>
                      {score !== null && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center rounded border px-1.5 py-0.2 text-[9px] font-bold ${scoreColor}`}>
                            Score: {score}%
                          </span>
                          {out.retry_count > 0 && (
                            <span className="text-[9px] text-[#A1A1AA]/60 font-mono">
                              ({out.retry_count} auto-repair {out.retry_count === 1 ? 'retry' : 'retries'})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions Container */}
                  <div className="flex items-center gap-1.5 print:hidden flex-wrap">
                    {approvalAction === 'Approve' ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-950/10 border border-emerald-900/30 px-2 py-1 text-[10px] font-bold text-emerald-400">
                        <Check className="h-3 w-3" /> Approved
                      </span>
                    ) : (
                      <button
                        onClick={() => handleApprove(out.agent_name)}
                        className="rounded-lg border border-[#262626] bg-[#111111] hover:bg-[#262626] text-[10px] font-bold text-[#A1A1AA] hover:text-[#FAFAFA] px-2.5 py-1.5 transition cursor-pointer"
                      >
                        Approve
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleStartEdit(out.agent_name, out.output)}
                      className="rounded-lg border border-[#262626] bg-[#111111] hover:bg-[#262626] text-[10px] font-bold text-[#A1A1AA] hover:text-[#FAFAFA] px-2.5 py-1.5 transition cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    
                    <button
                      onClick={() => handleRegenerate(out.agent_name)}
                      disabled={isRegenerating || regeneratingAgentName !== null}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#262626] bg-[#111111] hover:bg-[#262626] text-[10px] font-bold text-[#A1A1AA] hover:text-[#FAFAFA] px-2.5 py-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isRegenerating ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin text-[#2563EB]" />
                          <span>Regenerating...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 text-[#2563EB]" />
                          <span>Regenerate</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleCopy(out.output, out.id)}
                      className="rounded-lg border border-[#262626] bg-[#111111] hover:bg-[#262626] text-[10px] font-bold text-[#A1A1AA]/60 hover:text-[#FAFAFA] px-2.5 py-1.5 transition cursor-pointer"
                    >
                      {copiedId === out.id ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Validation Failures / Alerts */}
                {score !== null && score < 80 && out.validation_issues && (
                  <div className="mb-4 flex items-start gap-2.5 p-3 rounded-lg border border-red-900/30 bg-red-950/10 text-[11px] text-red-400 font-sans print:hidden">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                    <div>
                      <div className="font-bold">Self-Validation Quality Warning</div>
                      <div className="mt-1 font-mono text-[9px] leading-relaxed text-red-350/90">
                        gaps: {out.validation_issues}
                      </div>
                    </div>
                  </div>
                )}

                {/* Render Work text outputs */}
                {isEditing ? (
                  <div className="space-y-3.5">
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full min-h-[250px] bg-[#0A0A0A] border border-[#262626] rounded-lg p-3.5 text-xs font-mono text-[#FAFAFA] focus:outline-none focus:border-[#2563EB] leading-relaxed resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(out.agent_name)}
                        className="bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition cursor-pointer"
                      >
                        Save changes
                      </button>
                      <button
                        onClick={() => setEditingAgentName(null)}
                        className="bg-[#111111] border border-[#262626] hover:bg-[#262626] text-[#A1A1AA] hover:text-[#FAFAFA] font-bold px-3 py-1.5 rounded-lg text-[10px] transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none print:text-black mt-2">
                    {renderMarkdown(out.output)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Global Embedded Print Stylesheet */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          aside, nav, .print\\:hidden, button, a {
            display: none !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-card {
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            page-break-after: always;
            padding: 0 !important;
            margin-bottom: 2rem !important;
          }
          h1, h2, h3, h4, p, li, span, blockquote {
            color: black !important;
          }
          blockquote {
            border-left-color: #d1d5db !important;
          }
        }
      `}</style>

      {/* Toasts Container */}
      <div className="fixed bottom-5 right-5 z-55 flex flex-col gap-2.5">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast} onClose={removeToast} />
        ))}
      </div>
    </AppLayout>
  );
}
