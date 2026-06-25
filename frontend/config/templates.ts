export interface Template {
  id: string;
  name: string;
  emoji: string;
  description: string;
  goal: string;
}

export const TEMPLATES: Template[] = [
  {
    id: 'startup-launch',
    name: 'Startup Launch',
    emoji: '🚀',
    description: 'Structure roadmap and branding for launching a new product/startup idea.',
    goal: 'Launch a minimal viable product for a local organic food delivery startup with user onboarding and carrier management.'
  },
  {
    id: 'product-validation',
    name: 'Product Idea Validation',
    emoji: '📱',
    description: 'Conduct competitor research and profile target buyer personas.',
    goal: 'Validate a mobile application idea that allows neighborhood tool-sharing among homeowners to audit market interest.'
  },
  {
    id: 'learning-roadmap',
    name: 'Learning Roadmap',
    emoji: '📚',
    description: 'Design curriculum phases and resource syllabus for a new skill.',
    goal: 'Create a structured 90-day learning roadmap and practice plan to master WebAssembly and Rust compiler basics.'
  },
  {
    id: 'interview-prep',
    name: 'Interview Prep',
    emoji: '🎯',
    description: 'Prepare target topics, company research, and mock itineraries.',
    goal: 'Develop a comprehensive mock interview prep sheet and practice syllabus for a Senior Systems Engineer role at an AI tech company.'
  },
  {
    id: 'marketing-campaign',
    name: 'Marketing Campaign',
    emoji: '📈',
    description: 'Lay out social launch copy, acquisition funnels, and budgets.',
    goal: 'Plan a digital marketing campaign targeting college freshman CS students for a minimalist developer workspace launch.'
  }
];
