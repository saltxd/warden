// Colors
export const colors = {
  // Base
  bg: {
    primary: '#0a0a0a',
    secondary: '#141414',
    tertiary: '#1a1a1a',
    elevated: '#1f1f1f',
  },

  // Text
  text: {
    primary: '#ffffff',
    secondary: '#a1a1a1',
    muted: '#6b6b6b',
  },

  // Accent
  accent: {
    cyan: '#06b6d4',
    purple: '#8b5cf6',
    green: '#22c55e',
    amber: '#f59e0b',
    red: '#ef4444',
  },

  // Border
  border: {
    default: '#262626',
    hover: '#404040',
    active: '#525252',
  },
}

// Agent colors (for avatars)
export const agentColors: Record<string, { from: string; to: string }> = {
  nova: { from: '#06b6d4', to: '#0891b2' },      // Cyan
  atlas: { from: '#8b5cf6', to: '#7c3aed' },     // Purple
  sentinel: { from: '#22c55e', to: '#16a34a' },  // Green
  forge: { from: '#f59e0b', to: '#d97706' },     // Amber
}

// Get agent gradient
export function getAgentGradient(agentId: string): string {
  const agent = agentColors[agentId]
  if (!agent) return 'linear-gradient(135deg, #666, #444)'
  return `linear-gradient(135deg, ${agent.from}, ${agent.to})`
}

// Get agent primary color
export function getAgentColor(agentId: string): string {
  return agentColors[agentId]?.from || '#666'
}
