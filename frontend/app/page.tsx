'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { 
  Terminal, 
  ArrowRight, 
  Search, 
  Users, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  Cpu, 
  Layers, 
  GitBranch, 
  ArrowUpRight,
  Play,
  Check,
  Code,
  Flame
} from 'lucide-react';

// Specialized Agent Types for the interactive simulator
interface SimulatedAgent {
  id: string;
  name: string;
  role: string;
  icon: any;
  responsibility: string;
  outputTitle: string;
  outputContent: string;
}

const SIMULATED_AGENTS: SimulatedAgent[] = [
  {
    id: 'researcher',
    name: 'Research Agent Pro',
    role: 'Market & Competitor Analysis',
    icon: Search,
    responsibility: 'Analyzes target audience demographics, collects active market trends, and compiles structured competitor lists.',
    outputTitle: 'market_research_brief.md',
    outputContent: `## Target Audience Analysis
- **Primary Segment:** High-growth engineering teams (15-100 devs).
- **Core Pain Point:** Inefficient handoffs and context switching between tasks.
- **Key Competitors:** Linear, Notion, Jira.

## Strategic Position Recommendation
- Focus on zero-config agent orchestrations.
- Embed native Git-style versioning for deliverables.`
  },
  {
    id: 'architect',
    name: 'Persona Architect',
    role: 'User Experience & Demographics',
    icon: Users,
    responsibility: 'Generates detailed user profiles, map workflow paths, and drafts operational feedback requirements.',
    outputTitle: 'user_persona_profiles.json',
    outputContent: `{
  "persona_name": "Devin (Lead Architect)",
  "company_size": "50 developers",
  "technical_proficiency": "Expert (TypeScript, Go)",
  "goals": [
    "Reduce boilerplate coding in agent configurations",
    "Monitor active timelines in a unified workspace layout"
  ]
}`
  },
  {
    id: 'validator',
    name: 'Quality Validator',
    role: 'LLM Response & Output Quality Control',
    icon: ShieldCheck,
    responsibility: 'Performs semantic checks on deliverables, executes syntax validations, and triggers self-repair loops for scores below 85%.',
    outputTitle: 'validation_report.log',
    outputContent: `[INFO] Initiating output validation loop...
[CHECK] Markdown syntax verification: PASS
[CHECK] Competitor analysis coverage: PASS (3/3 identified)
[METRIC] Confidence Score: 94.2%
[STATUS] Deliverable approved. Written to semantic memory registry.`
  }
];

export default function LandingPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('researcher');
  
  // Simulation execution steps inside the hero visualizer
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [simulationStatus, setSimulationStatus] = useState<'idle' | 'running' | 'completed'>('idle');

  // Trigger auto-simulation run in loop when page loads
  useEffect(() => {
    if (simulationStatus !== 'running') return;
    
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= 3) {
          clearInterval(interval);
          setSimulationStatus('completed');
          return 3;
        }
        return prev + 1;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [simulationStatus]);

  const handleStartSimulation = () => {
    setCurrentStep(0);
    setSimulationStatus('running');
  };

  const activeAgent = SIMULATED_AGENTS.find(a => a.id === activeTab) || SIMULATED_AGENTS[0];

  // Scroll handler for smooth navigation
  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] font-sans selection:bg-[#2563EB] selection:text-white">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-[#0A0A0A]/85 backdrop-blur-md border-b border-[#262626] transition duration-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg border border-[#262626] bg-[#111111] flex items-center justify-center">
              <Terminal className="h-4.5 w-4.5 text-[#FAFAFA]" />
            </div>
            <span className="font-bold tracking-tight text-sm font-sans">ExecuteAI</span>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => scrollToId('features')} 
              className="text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition cursor-pointer"
            >
              Features
            </button>
            <button 
              onClick={() => scrollToId('simulator')} 
              className="text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition cursor-pointer"
            >
              Agent Simulator
            </button>
            <button 
              onClick={() => scrollToId('architecture')} 
              className="text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition cursor-pointer"
            >
              Architecture
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="h-6 w-16 bg-[#111111] animate-pulse rounded-md" />
            ) : isAuthenticated ? (
              <Link 
                href="/dashboard" 
                className="inline-flex items-center gap-1 bg-[#FAFAFA] hover:bg-[#E4E4E7] text-[#0A0A0A] px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Go to Dashboard <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="text-xs font-bold text-[#A1A1AA] hover:text-[#FAFAFA] transition px-2 py-1"
                >
                  Sign In
                </Link>
                <Link 
                  href="/register" 
                  className="bg-[#FAFAFA] hover:bg-[#E4E4E7] text-[#0A0A0A] px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-6 overflow-hidden border-b border-[#262626]/50">
        {/* Subtle top glow background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[350px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#111111] border border-[#262626] px-3.5 py-1 text-[11px] font-medium text-[#A1A1AA]">
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            <span>Introducing ExecuteAI 1.0</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#FAFAFA] max-w-3xl mx-auto leading-[1.08] font-sans">
            An AI Work <br/>
            <span className="text-[#2563EB]">Operating System.</span>
          </h1>

          <p className="text-sm sm:text-base text-[#A1A1AA] max-w-2xl mx-auto leading-relaxed font-sans">
            Transform high-level goals into completed, verified deliverables by orchestrating specialized AI agent workflows. No infinite chat loops. Just structured outputs.
          </p>

          <div className="flex flex-wrap justify-center gap-3.5 pt-4">
            <Link 
              href={isAuthenticated ? "/dashboard" : "/register"} 
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-lg shadow-blue-900/20 cursor-pointer"
            >
              Start Building Now
            </Link>
            <button 
              onClick={() => scrollToId('simulator')}
              className="border border-[#262626] bg-[#111111] hover:bg-[#262626] text-[#FAFAFA] px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Try Live Simulator
            </button>
          </div>
        </div>

        {/* Hero Execution Terminal Visualizer */}
        <div className="max-w-4xl mx-auto mt-16 rounded-xl border border-[#262626] bg-[#111111]/80 backdrop-blur-sm shadow-2xl relative">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#262626] bg-[#0A0A0A]/50">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#262626]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#262626]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#262626]" />
            </div>
            <span className="text-[10px] font-mono text-[#A1A1AA] font-semibold tracking-wider">executeai_core_pipeline.sh</span>
            <div className="w-10" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#262626] p-5 font-mono text-[11px] leading-relaxed">
            
            {/* Prompt Area Input */}
            <div className="p-4 space-y-4">
              <div>
                <span className="text-blue-500 font-bold">~ </span>
                <span className="text-[#A1A1AA]">define goal:</span>
              </div>
              <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-3 text-xs text-[#FAFAFA] font-mono leading-relaxed min-h-[90px]">
                Build a SaaS product competitor landscape analyzer and validator.
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleStartSimulation}
                  disabled={simulationStatus === 'running'}
                  className="inline-flex items-center gap-1.5 bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg px-4.5 py-2 text-xs font-bold transition cursor-pointer"
                >
                  <Play className="h-3 w-3 fill-current" />
                  {simulationStatus === 'idle' ? 'Run Workflow' : simulationStatus === 'running' ? 'Running...' : 'Rerun Simulation'}
                </button>
                
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[9px] font-bold ${
                  simulationStatus === 'running' ? 'border-yellow-900/50 bg-yellow-950/10 text-yellow-500 animate-pulse' :
                  simulationStatus === 'completed' ? 'border-emerald-900/50 bg-emerald-950/10 text-emerald-400' :
                  'border-[#262626] text-[#A1A1AA]/50'
                }`}>
                  {simulationStatus.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Timelines Area */}
            <div className="p-4 space-y-4">
              <span className="text-[#A1A1AA] font-bold uppercase tracking-wider text-[9px]">Execution Logs</span>

              <div className="space-y-4 relative pl-3.5 border-l border-[#262626]">
                {/* Step 1 */}
                <div className={`transition-all duration-300 ${currentStep >= 1 ? 'opacity-100 text-[#FAFAFA]' : 'opacity-30 text-[#A1A1AA]'}`}>
                  <div className="absolute -left-[5.5px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#2563EB] border-2 border-[#111111]" />
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-blue-500" />
                    <span className="font-bold">Step 1: Workspace Blueprint</span>
                  </div>
                  <p className="text-[10px] text-[#A1A1AA] pl-4.5 mt-0.5">Synthesized checklist, 3 agents scheduled.</p>
                </div>

                {/* Step 2 */}
                <div className={`transition-all duration-300 ${currentStep >= 2 ? 'opacity-100 text-[#FAFAFA]' : 'opacity-30 text-[#A1A1AA]'}`}>
                  <div className={`absolute -left-[5.5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#111111] ${currentStep >= 2 ? 'bg-[#2563EB]' : 'bg-[#262626]'}`} />
                  <div className="flex items-center gap-1.5">
                    {currentStep >= 2 ? <Check className="h-3 w-3 text-blue-500" /> : <span className="h-3 w-3 border border-[#262626] rounded-full inline-block" />}
                    <span className="font-bold">Step 2: Parallel Agents Run</span>
                  </div>
                  <p className="text-[10px] text-[#A1A1AA] pl-4.5 mt-0.5">ResearchPro & Persona generator executed.</p>
                </div>

                {/* Step 3 */}
                <div className={`transition-all duration-300 ${currentStep >= 3 ? 'opacity-100 text-[#FAFAFA]' : 'opacity-30 text-[#A1A1AA]'}`}>
                  <div className={`absolute -left-[5.5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#111111] ${currentStep >= 3 ? 'bg-[#2563EB]' : 'bg-[#262626]'}`} />
                  <div className="flex items-center gap-1.5">
                    {currentStep >= 3 ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <span className="h-3 w-3 border border-[#262626] rounded-full inline-block" />}
                    <span className="font-bold">Step 3: Verification Audit</span>
                  </div>
                  <p className="text-[10px] text-[#A1A1AA] pl-4.5 mt-0.5">Validator passed. Quality score 94.2% (Semantic Lock).</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Features Pillars Grid */}
      <section id="features" className="max-w-7xl mx-auto py-24 px-6 border-b border-[#262626]/50">
        <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
          <h2 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">Designed for Professional Engineers</h2>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            Eliminating conversational bloat. ExecuteAI structures requirements, profiles custom agents, and runs isolated workflows with rigorous verification checks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="rounded-xl border border-[#262626] bg-[#111111] p-6 space-y-4 hover:border-[#333333] transition duration-200">
            <div className="h-10 w-10 rounded-lg border border-[#262626] bg-[#0A0A0A] flex items-center justify-center text-blue-500">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-[#FAFAFA]">Dynamic Blueprinting</h3>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Your goal is parsed, domain category cataloged, and estimated steps mapped. Customize the entire task registry before kickstarting execution.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-xl border border-[#262626] bg-[#111111] p-6 space-y-4 hover:border-[#333333] transition duration-200">
            <div className="h-10 w-10 rounded-lg border border-[#262626] bg-[#0A0A0A] flex items-center justify-center text-blue-500">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-[#FAFAFA]">Orchestrated Parallel Workflows</h3>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Run specialized, single-responsibility agents in parallel pipelines. Each runs isolated contexts, mitigating hallucination limits and keeping output focused.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-xl border border-[#262626] bg-[#111111] p-6 space-y-4 hover:border-[#333333] transition duration-200">
            <div className="h-10 w-10 rounded-lg border border-[#262626] bg-[#0A0A0A] flex items-center justify-center text-blue-500">
              <GitBranch className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-[#FAFAFA]">Git-Style Version Control</h3>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Every deliverable is written into the Semantic Memory timeline. Browse results, download raw markdown, or review commit-style audit logs dynamically.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Agent Simulator */}
      <section id="simulator" className="max-w-7xl mx-auto py-24 px-6 border-b border-[#262626]/50">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">Interactive Agent Simulator</h2>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Click on the agent classes below to explore how ExecuteAI dynamically assigns responsibilities and generates specific structural data blocks.
              </p>
            </div>

            {/* Tabs List */}
            <div className="flex flex-col gap-2.5">
              {SIMULATED_AGENTS.map((agent) => {
                const Icon = agent.icon;
                const isActive = activeTab === agent.id;
                return (
                  <button
                    key={agent.id}
                    onClick={() => setActiveTab(agent.id)}
                    className={`flex items-center gap-4 text-left p-4.5 rounded-xl border transition cursor-pointer duration-200 ${
                      isActive 
                        ? 'border-[#2563EB] bg-[#2563EB]/5 text-white' 
                        : 'border-[#262626] bg-[#111111] hover:bg-[#161616] text-[#A1A1AA]'
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      isActive ? 'bg-[#2563EB] text-white' : 'bg-[#0A0A0A] border border-[#262626]'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold">{agent.name}</h4>
                      <p className="text-[10px] text-[#A1A1AA] mt-0.5">{agent.role}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview Panel Code Viewer */}
          <div className="lg:col-span-7 rounded-xl border border-[#262626] bg-[#111111] overflow-hidden self-stretch flex flex-col min-h-[380px]">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#262626] bg-[#0A0A0A]/30">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-[#A1A1AA]" />
                <span className="text-[10px] font-mono text-[#FAFAFA] font-bold">{activeAgent.outputTitle}</span>
              </div>
              <span className="text-[9px] font-mono bg-[#0A0A0A] border border-[#262626] px-2 py-0.5 rounded text-emerald-400">
                COMPILED
              </span>
            </div>

            {/* Responsibility description bar */}
            <div className="bg-[#0A0A0A]/60 px-5 py-3 border-b border-[#262626]/60 text-[10px] text-[#A1A1AA] leading-relaxed">
              <span className="text-[#FAFAFA] font-bold">Agent Mandate: </span>
              {activeAgent.responsibility}
            </div>

            {/* Code Output Viewer */}
            <div className="flex-1 p-5 font-mono text-[11px] text-[#FAFAFA] bg-[#0A0A0A] overflow-y-auto leading-relaxed select-text">
              <pre className="whitespace-pre-wrap">{activeAgent.outputContent}</pre>
            </div>
          </div>

        </div>
      </section>

      {/* Architecture / Reliability Section */}
      <section id="architecture" className="max-w-7xl mx-auto py-24 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Timeline Graphic representation */}
          <div className="space-y-4 rounded-xl border border-[#262626] bg-[#111111] p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA] mb-4">Pipeline Self-Repair Loop</h3>
            
            <div className="space-y-6 relative pl-4 border-l border-[#262626]">
              {/* Box 1 */}
              <div className="relative">
                <div className="absolute -left-[20.5px] top-1 h-2 w-2 rounded-full bg-[#2563EB]" />
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold font-mono text-[#FAFAFA]">LLM Workspace Generator</span>
                  <span className="text-[#A1A1AA]">Initial Output</span>
                </div>
                <div className="mt-2 p-2 bg-[#0A0A0A] border border-[#262626] rounded text-[10px] font-mono text-[#A1A1AA]">
                  Marketing proposal generation request dispatched... Completed.
                </div>
              </div>

              {/* Box 2 */}
              <div className="relative">
                <div className="absolute -left-[20.5px] top-1 h-2 w-2 rounded-full bg-yellow-500" />
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold font-mono text-yellow-500">Quality Checker Audit</span>
                  <span className="text-red-400 font-bold">Failed (74.0%)</span>
                </div>
                <div className="mt-2 p-2 bg-[#0A0A0A] border border-[#262626] rounded text-[10px] font-mono text-red-400">
                  Critical issue: Missing audience competitors context. Score below threshold.
                </div>
              </div>

              {/* Box 3 */}
              <div className="relative">
                <div className="absolute -left-[20.5px] top-1 h-2 w-2 rounded-full bg-emerald-500" />
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold font-mono text-emerald-400">Auto-Repair Validation Run</span>
                  <span className="text-emerald-400 font-bold">Passed (92.5%)</span>
                </div>
                <div className="mt-2 p-2 bg-[#0A0A0A] border border-emerald-950/20 rounded text-[10px] font-mono text-emerald-400">
                  Refined output generated with correct competitive analysis. Deliverable locked.
                </div>
              </div>
            </div>
          </div>

          {/* Text Description */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[#262626] bg-[#111111] text-[9px] font-mono text-blue-400 uppercase tracking-widest">
              Reliability Architecture
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#FAFAFA]">
              Zero Compromise on <br/>Output Soundness
            </h2>

            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Unlike chat interfaces where users must manually test, identify, and copy-paste code outputs repeatedly, ExecuteAI embeds automated **Validator Agents** into the execution thread itself. 
            </p>

            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              If an output falls short of semantic criteria or fails code parsing, the workflow triggers a dedicated repair cycle using error state memory, improving output quality autonomously.
            </p>

            <div className="flex items-center gap-6 pt-4 border-t border-[#262626] font-mono text-[10px] text-[#A1A1AA]">
              <div>
                <span className="block text-lg font-bold text-white tracking-tight">85%</span>
                <span>Min Quality Score</span>
              </div>
              <div className="h-8 border-l border-[#262626]" />
              <div>
                <span className="block text-lg font-bold text-white tracking-tight">3x Max</span>
                <span>Auto-Repair Loops</span>
              </div>
              <div className="h-8 border-l border-[#262626]" />
              <div>
                <span className="block text-lg font-bold text-white tracking-tight">Git-Lock</span>
                <span>State Versioning</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Secondary Hero Callout */}
      <section className="bg-[#111111] border-y border-[#262626] py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Unlock Agent-Driven Execution Today</h2>
          <p className="text-xs text-[#A1A1AA] max-w-md mx-auto leading-relaxed">
            Configure blueprints, orchestrate custom teams of autonomous LLM agents, and record every milestone to versioned memory logs.
          </p>
          <div className="pt-2">
            <Link 
              href={isAuthenticated ? "/dashboard" : "/register"} 
              className="inline-flex items-center gap-1.5 bg-[#FAFAFA] hover:bg-[#E4E4E7] text-[#0A0A0A] px-5 py-2.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
            >
              Get Started <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Sticky Footer */}
      <footer className="max-w-7xl mx-auto py-12 px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-[#A1A1AA] text-[11px]">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-[#A1A1AA]/50" />
          <span>ExecuteAI &copy; 2026. Made for builders.</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="hover:text-white transition">Sign In</Link>
          <Link href="/register" className="hover:text-white transition">Register</Link>
          <button onClick={() => scrollToId('features')} className="hover:text-white transition cursor-pointer">Features</button>
        </div>
      </footer>
    </div>
  );
}
