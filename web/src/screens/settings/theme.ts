/**
 * Theme tokens for Settings dark UI, sampled from the automotive / robot control reference.
 * Contrast ratio >= 4.5:1 against respective backgrounds.
 */
export const theme = {
  // Surfaces
  background: '#090d14',
  backgroundSubtle: '#0f1521',
  card: '#151b24',
  cardPressed: '#1d2634',
  cardDisabled: '#0e131b',
  cardBorder: '#232c3a',
  cardBorderHover: '#334155',

  // Typography
  text: '#f8fafc',
  textMuted: '#94a3b8',
  textSubtle: '#64748b',
  textDisabled: '#475569',

  // Borders
  border: '#232c3a',
  borderSubtle: '#1a222e',

  // Semantic & status colors
  // Note: Red (danger) is reserved strictly for DỪNG, errors, and danger states.
  danger: '#ef4444',
  dangerHover: '#dc2626',
  dangerBg: 'rgba(239, 68, 68, 0.15)',
  dangerBorder: 'rgba(239, 68, 68, 0.35)',

  success: '#22c55e',
  warning: '#f59e0b',
  info: '#3b82f6',
  accent: '#f47518',
  accentHover: '#ea580c',
  accentBg: 'rgba(244, 117, 24, 0.15)',
  accentBorder: 'rgba(244, 117, 24, 0.35)',

  // Status chip token mappings
  chip: {
    gray: {
      bg: 'rgba(100, 116, 139, 0.16)',
      border: 'rgba(100, 116, 139, 0.35)',
      text: '#94a3b8',
      dot: '#94a3b8',
    },
    amber: {
      bg: 'rgba(245, 158, 11, 0.16)',
      border: 'rgba(245, 158, 11, 0.38)',
      text: '#fbbf24',
      dot: '#f59e0b',
    },
    green: {
      bg: 'rgba(34, 197, 94, 0.16)',
      border: 'rgba(34, 197, 94, 0.38)',
      text: '#4ade80',
      dot: '#22c55e',
    },
    blue: {
      bg: 'rgba(59, 130, 246, 0.16)',
      border: 'rgba(59, 130, 246, 0.38)',
      text: '#60a5fa',
      dot: '#3b82f6',
    },
    red: {
      bg: 'rgba(239, 68, 68, 0.16)',
      border: 'rgba(239, 68, 68, 0.38)',
      text: '#f87171',
      dot: '#ef4444',
    },
  },
} as const;

export type Theme = typeof theme;
