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
  lang: saved.lang === 'ko' ? 'ko' : 'en', // 'ko' | 'en' (defaults to English)
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

// Touch (no-hover) only: which item's hover action pill is currently revealed.
// On a touch device there is no hover, so tapping an item reveals its tools (the
// touch analog of hover) and tapping anywhere else clears it. A single window
// pointerdown listener in App.svelte drives this; CSS only reads it under
// `@media (hover: none)`, so pointer-capable devices are unaffected.
export const touchItem = $state({ id: null })
export function setTouchItem(id) {
  if (touchItem.id !== id) touchItem.id = id
}

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
