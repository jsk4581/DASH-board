// ============================================================
// Undo / redo history for the board.
// Rapid changes (typing, dragging) are coalesced into a single
// step via a short debounce, so one Ctrl+Z reverts one action.
// ============================================================

import { board, replaceBoard } from './store.svelte.js'

const MAX = 100
const COALESCE_MS = 350

let past = []
let future = []
let lastSerialized = JSON.stringify($state.snapshot(board))
let restoring = false
let timer = null

// reactive flags for the toolbar buttons
export const history = $state({ canUndo: false, canRedo: false })

function refresh() {
  history.canUndo = past.length > 0
  history.canRedo = future.length > 0
}

const serialize = () => JSON.stringify($state.snapshot(board))

/** Fold any pending (debounced) change into the undo stack right now. */
function commitPending() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  const s = serialize()
  if (s !== lastSerialized) {
    past.push(lastSerialized)
    if (past.length > MAX) past.shift()
    future = []
    lastSerialized = s
    refresh()
  }
}

// Watch the board; schedule a coalesced commit after activity settles.
$effect.root(() => {
  $effect(() => {
    const s = serialize() // deep-tracks the whole board
    if (restoring || s === lastSerialized) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(commitPending, COALESCE_MS)
  })
})

function restore(snapshotJSON) {
  restoring = true
  replaceBoard(JSON.parse(snapshotJSON))
  lastSerialized = snapshotJSON
  refresh()
  // board mutation re-runs the watcher; clear the flag once it has settled
  queueMicrotask(() => {
    restoring = false
  })
}

export function undo() {
  commitPending()
  if (!past.length) return
  future.push(serialize())
  if (future.length > MAX) future.shift()
  restore(past.pop())
}

export function redo() {
  commitPending()
  if (!future.length) return
  past.push(serialize())
  if (past.length > MAX) past.shift()
  restore(future.pop())
}
