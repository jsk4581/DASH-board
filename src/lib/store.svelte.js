// ============================================================
// Board state — the single source of truth.
// Deep-reactive via Svelte 5 $state; autosaved to localStorage.
// ============================================================

import { toISODate } from './date.js'
import { t } from './i18n.svelte.js'

const STORAGE_KEY = 'dash-board-v1'
const SCHEMA_VERSION = 1

// Accent palette assigned to project cards (cycled on creation).
// Palest Multica-style pastels — constant high lightness / low chroma, hue varied.
export const PALETTE = [
  'oklch(0.84 0.06 255)', // pale blue
  'oklch(0.85 0.06 162)', // pale green
  'oklch(0.88 0.07 75)', // pale amber
  'oklch(0.84 0.06 300)', // pale purple
  'oklch(0.86 0.05 215)', // pale cyan
  'oklch(0.85 0.07 350)', // pale rose
  'oklch(0.83 0.06 275)', // pale indigo
  'oklch(0.87 0.06 140)', // pale mint
]

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'id-' + Math.abs(Date.now() ^ (performance.now() * 1000)).toString(36)
}

function seed() {
  const d = (offset) => toISODate(new Date(Date.now() + offset * 86_400_000))
  return {
    meta: { version: SCHEMA_VERSION, title: 'DASH' },
    projects: [
      {
        id: uid(),
        title: '논문 프로젝트',
        color: PALETTE[0],
        items: [
          { id: uid(), text: '관련 연구 서베이 정리', status: 'done', start: null, due: d(-1) },
          { id: uid(), text: '실험 파이프라인 구현', status: 'highlight', start: d(0), due: d(4) },
          { id: uid(), text: '초안 작성', status: 'default', start: null, due: d(9) },
        ],
      },
      {
        id: uid(),
        title: '집안일',
        color: PALETTE[2],
        items: [
          { id: uid(), text: '장보기', status: 'default', start: null, due: d(0) },
          { id: uid(), text: '세탁기 필터 청소', status: 'default', start: null, due: d(2) },
        ],
      },
      {
        id: uid(),
        title: '사이드 프로젝트',
        color: PALETTE[5],
        items: [
          { id: uid(), text: '랜딩 페이지 디자인', status: 'highlight', start: d(1), due: d(3) },
          { id: uid(), text: '도메인 구매', status: 'default', start: null, due: null },
          { id: uid(), text: '베타 모집 글 작성', status: 'default', start: null, due: d(7) },
        ],
      },
    ],
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.projects)) return normalize(parsed)
    }
  } catch (e) {
    console.warn('[DASH] failed to load saved board:', e)
  }
  return seed()
}

/** Coerce an arbitrary parsed object into a valid board (used for load & import). */
export function normalize(raw) {
  return {
    meta: { version: SCHEMA_VERSION, title: raw?.meta?.title ?? 'DASH' },
    projects: (raw.projects ?? []).map((p, i) => ({
      id: p.id ?? uid(),
      title: p.title ?? t('untitled'),
      color: p.color ?? PALETTE[i % PALETTE.length],
      items: (p.items ?? []).map((it) => ({
        id: it.id ?? uid(),
        text: it.text ?? '',
        status: ['default', 'done', 'highlight'].includes(it.status) ? it.status : 'default',
        start: it.start ?? null,
        due: it.due ?? null,
      })),
    })),
  }
}

// The reactive board. Mutate its properties; never reassign the binding.
export const board = $state(load())

// ---- autosave ----------------------------------------------------------
$effect.root(() => {
  $effect(() => {
    const snapshot = JSON.stringify($state.snapshot(board))
    try {
      localStorage.setItem(STORAGE_KEY, snapshot)
    } catch (e) {
      console.warn('[DASH] autosave failed:', e)
    }
  })
})

// ---- lookups -----------------------------------------------------------
export function findProject(pid) {
  return board.projects.find((p) => p.id === pid)
}

// ---- project mutations -------------------------------------------------
export function addProject(title = t('newProject')) {
  const color = PALETTE[board.projects.length % PALETTE.length]
  const project = { id: uid(), title, color, items: [] }
  board.projects.push(project)
  return project
}

export function removeProject(pid) {
  const i = board.projects.findIndex((p) => p.id === pid)
  if (i !== -1) board.projects.splice(i, 1)
}

// Reorder helpers for drag-and-drop (mutating through the store keeps `board`
// the owner of the data, avoiding Svelte's prop-ownership warnings).
export function setProjects(projects) {
  board.projects = projects
}

export function setItems(pid, items) {
  const p = findProject(pid)
  if (p) p.items = items
}

export function renameProject(pid, title) {
  const p = findProject(pid)
  if (p) p.title = title
}

export function setProjectColor(pid, color) {
  const p = findProject(pid)
  if (p) p.color = color
}

// ---- item mutations ----------------------------------------------------
export function addItem(pid, text = '') {
  const p = findProject(pid)
  if (!p) return null
  const item = { id: uid(), text, status: 'default', start: null, due: null }
  p.items.push(item)
  return item
}

export function removeItem(pid, iid) {
  const p = findProject(pid)
  if (!p) return
  const i = p.items.findIndex((it) => it.id === iid)
  if (i !== -1) p.items.splice(i, 1)
}

export function updateItemText(pid, iid, text) {
  const it = findProject(pid)?.items.find((x) => x.id === iid)
  if (it) it.text = text
}

/** Cycle / toggle one of the three states. Re-applying the same state resets to default. */
export function toggleStatus(pid, iid, status) {
  const it = findProject(pid)?.items.find((x) => x.id === iid)
  if (!it) return
  it.status = it.status === status ? 'default' : status
}

export function setItemDates(pid, iid, { start = undefined, due = undefined }) {
  const it = findProject(pid)?.items.find((x) => x.id === iid)
  if (!it) return
  if (start !== undefined) it.start = start
  if (due !== undefined) it.due = due
}

export function clearItemDates(pid, iid) {
  setItemDates(pid, iid, { start: null, due: null })
}

// ---- export / import ---------------------------------------------------
export function toJSON() {
  return JSON.stringify($state.snapshot(board), null, 2)
}

export function exportFile() {
  const blob = new Blob([toJSON()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dash-${toISODate(new Date())}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Replace the whole board from a parsed object (mutates in place to keep reactivity). */
export function replaceBoard(raw) {
  const next = normalize(raw)
  board.meta = next.meta
  board.projects = next.projects
}

export async function importFile(file) {
  const text = await file.text()
  const parsed = JSON.parse(text)
  if (!parsed || !Array.isArray(parsed.projects)) {
    throw new Error(t('invalidFile'))
  }
  replaceBoard(parsed)
}
