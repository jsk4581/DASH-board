// UI preferences — kept separate from board data so they never end up in exports.

const UI_KEY = 'dash-ui-v1'

function loadUI() {
  try {
    const raw = localStorage.getItem(UI_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return {}
}

const saved = loadUI()

function prefersDark() {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
}

export const ui = $state({
  mode: saved.mode === 'view' ? 'view' : 'edit', // 'edit' | 'view'
  theme: saved.theme ?? (prefersDark() ? 'dark' : 'light'), // 'light' | 'dark'
  timelineView: saved.timelineView === 'gantt' ? 'gantt' : 'calendar', // 'calendar' | 'gantt'
  lang: saved.lang === 'en' ? 'en' : 'ko', // 'ko' | 'en'
})

$effect.root(() => {
  // persist
  $effect(() => {
    try {
      localStorage.setItem(UI_KEY, JSON.stringify($state.snapshot(ui)))
    } catch {
      /* ignore */
    }
  })
  // reflect theme onto <html> for the CSS token swap
  $effect(() => {
    document.documentElement.dataset.theme = ui.theme
  })
  // reflect language onto <html lang> for a11y / correct hyphenation
  $effect(() => {
    document.documentElement.lang = ui.lang
  })
})

export function toggleMode() {
  ui.mode = ui.mode === 'edit' ? 'view' : 'edit'
}

export function toggleTheme() {
  ui.theme = ui.theme === 'dark' ? 'light' : 'dark'
}

export function setTimelineView(v) {
  ui.timelineView = v
}

export function toggleLang() {
  ui.lang = ui.lang === 'ko' ? 'en' : 'ko'
}

export const isEditing = () => ui.mode === 'edit'
