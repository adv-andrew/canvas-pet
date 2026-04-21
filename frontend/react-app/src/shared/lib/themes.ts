export type ThemeId = 'crimson' | 'violet' | 'ocean' | 'forest' | 'sunset' | 'rose'

export const THEMES: { id: ThemeId; label: string; preview: string }[] = [
  { id: 'crimson', label: 'Crimson', preview: '#c53030' },
  { id: 'violet',  label: 'Violet',  preview: '#7c3aed' },
  { id: 'ocean',   label: 'Ocean',   preview: '#0369a1' },
  { id: 'forest',  label: 'Forest',  preview: '#166534' },
  { id: 'sunset',  label: 'Sunset',  preview: '#b45309' },
  { id: 'rose',    label: 'Rose',    preview: '#be185d' },
]

export const DEFAULT_THEME: ThemeId = 'crimson'
export const THEME_STORAGE_KEY = 'cp-theme'
