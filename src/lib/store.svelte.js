// ============================================================
// Board state — multiple named boards in one document.
// Deep-reactive via Svelte 5 $state; autosaved to localStorage.
// `board` is the ACTIVE board; the drawer switches `library.activeId`.
// activeId is a local view choice — it is not part of sync/undo content.
// ============================================================

import { tick } from 'svelte'
import { toISODate } from './date.js'
import { t } from './i18n.svelte.js'

const STORAGE_KEY = 'dash-board-v1'
const SCHEMA_VERSION = 2

// Accent palette assigned to project cards (cycled on creation).
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

function seedProjects() {
  const d = (offset) => toISODate(new Date(Date.now() + offset * 86_400_000))
  return [
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
  ]
}

function seed() {
  const boards = [{ id: uid(), name: t('defaultBoardName'), projects: seedProjects() }]
  return { activeId: boards[0].id, boards }
}

// ---- normalization -----------------------------------------------------
function normalizeItem(it) {
  return {
    id: it.id ?? uid(),
    text: it.text ?? '',
    status: ['default', 'done', 'highlight'].includes(it.status) ? it.status : 'default',
    start: it.start ?? null,
    due: it.due ?? null,
  }
}
function normalizeProject(p, i) {
  return {
    id: p.id ?? uid(),
    title: p.title ?? t('untitled'),
    color: p.color ?? PALETTE[i % PALETTE.length],
    items: (p.items ?? []).map(normalizeItem),
  }
}
function normalizeBoard(b) {
  return {
    id: b.id ?? uid(),
    name: b.name ?? b.meta?.title ?? t('untitled'),
    projects: (b.projects ?? []).map(normalizeProject),
  }
}

/** Accept the new `{boards}` shape, a bare array, or a legacy single `{projects}` board. */
export function normalizeBoards(raw) {
  let arr
  if (Array.isArray(raw)) arr = raw
  else if (Array.isArray(raw?.boards)) arr = raw.boards
  else if (Array.isArray(raw?.projects))
    arr = [{ id: uid(), name: raw.meta?.title ?? t('defaultBoardName'), projects: raw.projects }]
  else arr = []
  const boards = arr.map(normalizeBoard)
  return boards.length ? boards : [{ id: uid(), name: t('defaultBoardName'), projects: [] }]
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const boards = normalizeBoards(parsed)
      const activeId = boards.some((b) => b.id === parsed?.activeId) ? parsed.activeId : boards[0].id
      return { activeId, boards }
    }
  } catch (e) {
    console.warn('[DASH] failed to load saved board:', e)
  }
  return seed()
}

// The reactive library; mutate its properties, never reassign the binding.
export const library = $state(load())

// The active board. A getter object (not exported $derived, which modules
// disallow) so every existing `board.projects` read/write stays reactive.
function active() {
  return library.boards.find((b) => b.id === library.activeId) ?? library.boards[0]
}
export const board = {
  get id() {
    return active().id
  },
  get name() {
    return active().name
  },
  get projects() {
    return active().projects
  },
  set projects(v) {
    active().projects = v
  },
}

// ---- autosave ----------------------------------------------------------
$effect.root(() => {
  $effect(() => {
    const snapshot = JSON.stringify($state.snapshot(library))
    try {
      localStorage.setItem(STORAGE_KEY, snapshot)
    } catch (e) {
      console.warn('[DASH] autosave failed:', e)
    }
  })
})

// When the WHOLE visible board is swapped (board switch, import, sync pull,
// undo/redo) the grid's cells are all removed/created at once. Setting this true
// for that render suppresses the per-card create/delete pop & lift-out, so a
// swap is an instant change — only genuine single add/delete animates.
export const swapping = $state({ on: false })
function lockSwap() {
  swapping.on = true
  // release after the swap's DOM update has flushed (transitions read it at create time)
  tick().then(() => {
    swapping.on = false
  })
}

// ---- board (library) mutations ----------------------------------------
export function addBoard(name = t('newBoard')) {
  lockSwap()
  const b = { id: uid(), name: name || t('newBoard'), projects: [] }
  library.boards.push(b)
  library.activeId = b.id
  return b
}

export function renameBoard(id, name) {
  const b = library.boards.find((x) => x.id === id)
  if (b) b.name = name
}

export function removeBoard(id) {
  const i = library.boards.findIndex((b) => b.id === id)
  if (i === -1) return
  lockSwap()
  library.boards.splice(i, 1)
  if (library.boards.length === 0) {
    library.boards.push({ id: uid(), name: t('defaultBoardName'), projects: [] })
  }
  if (!library.boards.some((b) => b.id === library.activeId)) {
    library.activeId = library.boards[0].id
  }
}

export function switchBoard(id) {
  if (library.boards.some((b) => b.id === id) && id !== library.activeId) {
    lockSwap()
    library.activeId = id
  }
}

export function setBoards(boards) {
  lockSwap()
  library.boards = boards
}

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

// Reorder helpers for drag-and-drop (mutating through the store keeps the board
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

// ---- serialize / replace (used by sync, undo-redo, export/import) ------
/** All boards as a versioned JSON document (the unit of sync, undo, export). */
export function serializeBoards() {
  return JSON.stringify({ version: SCHEMA_VERSION, boards: $state.snapshot(library.boards) }, null, 2)
}

/** Replace all boards from a parsed object; keep the active selection if still valid. */
export function replaceBoards(raw) {
  lockSwap()
  const boards = normalizeBoards(raw)
  library.boards = boards
  if (!boards.some((b) => b.id === library.activeId)) library.activeId = boards[0].id
}

// ---- export / import ---------------------------------------------------
export function exportFile() {
  const blob = new Blob([serializeBoards()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dash-${toISODate(new Date())}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function importFile(file) {
  const text = await file.text()
  const parsed = JSON.parse(text)
  const ok =
    Array.isArray(parsed) || Array.isArray(parsed?.boards) || Array.isArray(parsed?.projects)
  if (!ok) throw new Error(t('invalidFile'))
  replaceBoards(parsed)
}
