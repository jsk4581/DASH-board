// ============================================================
// Memos: chat-style notes to yourself, one thread per topic.
//
// Kept apart from the board on purpose. The board is one small JSON
// document that is saved, synced and undone as a whole; memos are an
// ever-growing log, so they live as records in IndexedDB, stay out of
// undo history, and change through small idempotent ops (add / rename /
// edit / delete) that merge cleanly when two devices append at once.
// ============================================================

import { openDB, idb } from './idb.js'
import * as memoSync from './memoSync.js'
import { uid } from './store.svelte.js'
import { t } from './i18n.svelte.js'

const DB_NAME = 'dash-memo'
const DB_VERSION = 1
const UI_KEY = 'dash-memo-ui-v1'
export const MEMO_SCHEMA = 1

export const memo = $state({
  ready: false,
  persistent: true, // false when IndexedDB is unavailable (memos then last one session)
  threads: [], // { id, title, createdAt, updatedAt, renamedAt }
  messages: [], // { id, threadId, ts, text, editedAt }
  activeId: null,
})

let db = null

function upgrade(d) {
  d.createObjectStore('threads', { keyPath: 'id' })
  d.createObjectStore('messages', { keyPath: 'id' }).createIndex('threadId', 'threadId')
  d.createObjectStore('pending', { keyPath: 'id' }) // ops not yet shipped by memoSync
  d.createObjectStore('meta') // key-value (sync cursor etc.)
}

function persist(ops) {
  if (!db || !ops.length) return
  idb.batch(db, ['threads', 'messages'], ops).catch((e) => console.warn('[DASH] memo save failed:', e))
}

function loadUI() {
  try {
    return JSON.parse(localStorage.getItem(UI_KEY) || '{}')
  } catch {
    return {}
  }
}
function saveUI() {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify({ activeId: memo.activeId }))
  } catch {
    /* ignore */
  }
}

const thread = (id) => memo.threads.find((th) => th.id === id)
const message = (id) => memo.messages.find((m) => m.id === id)
const snap = (o) => $state.snapshot(o)

// ---- ops ----------------------------------------------------------------
// Every change is an op. Applying one is idempotent (adds skip known ids,
// renames/edits are last-writer-wins on their timestamp, deletes of missing
// records are no-ops), so replaying remote ops in any order converges.

/** Apply an op. Local ops are persisted and handed to memoSync; remote ones only persisted. */
export function applyOp(op, { remote = false } = {}) {
  let changed = false
  const writes = []
  switch (op.type) {
    case 'thread.add': {
      if (thread(op.threadId)) break
      const th = { id: op.threadId, title: op.title, createdAt: op.ts, updatedAt: op.ts, renamedAt: op.ts }
      memo.threads.push(th)
      writes.push(['threads', 'put', th])
      changed = true
      break
    }
    case 'thread.rename': {
      const th = thread(op.threadId)
      if (!th || op.ts < th.renamedAt) break
      th.title = op.title
      th.renamedAt = op.ts
      writes.push(['threads', 'put', snap(th)])
      changed = true
      break
    }
    case 'thread.delete': {
      const i = memo.threads.findIndex((th) => th.id === op.threadId)
      if (i < 0) break
      memo.threads.splice(i, 1)
      writes.push(['threads', 'del', op.threadId])
      for (const m of memo.messages) if (m.threadId === op.threadId) writes.push(['messages', 'del', m.id])
      memo.messages = memo.messages.filter((m) => m.threadId !== op.threadId)
      if (memo.activeId === op.threadId) setActive(null)
      changed = true
      break
    }
    case 'msg.add': {
      const th = thread(op.threadId)
      if (!th || message(op.msgId)) break
      const m = { id: op.msgId, threadId: op.threadId, ts: op.ts, text: op.text, editedAt: 0 }
      memo.messages.push(m)
      writes.push(['messages', 'put', m])
      if (op.ts > th.updatedAt) {
        th.updatedAt = op.ts
        writes.push(['threads', 'put', snap(th)])
      }
      changed = true
      break
    }
    case 'msg.edit': {
      const m = message(op.msgId)
      if (!m || op.ts < m.editedAt) break
      m.text = op.text
      m.editedAt = op.ts
      writes.push(['messages', 'put', snap(m)])
      changed = true
      break
    }
    case 'msg.delete': {
      const i = memo.messages.findIndex((m) => m.id === op.msgId)
      if (i < 0) break
      memo.messages.splice(i, 1)
      writes.push(['messages', 'del', op.msgId])
      changed = true
      break
    }
  }
  if (changed) persist(writes)
  if (!remote) memoSync.enqueue(op)
  return changed
}

function local(fields) {
  return applyOp({ id: uid(), ts: Date.now(), ...fields })
}

// ---- mutations ------------------------------------------------------------

export function addThread(title = t('newThread')) {
  const threadId = uid()
  local({ type: 'thread.add', threadId, title: title.trim() || t('newThread') })
  setActive(threadId)
  return threadId
}

export function renameThread(threadId, title) {
  const name = title.trim()
  if (name && thread(threadId)?.title !== name) local({ type: 'thread.rename', threadId, title: name })
}

export function deleteThread(threadId) {
  local({ type: 'thread.delete', threadId })
}

export function sendMessage(threadId, text) {
  const body = text.replace(/\s+$/, '')
  if (!body.trim() || !thread(threadId)) return null
  const msgId = uid()
  local({ type: 'msg.add', msgId, threadId, text: body })
  return msgId
}

export function editMessage(msgId, text) {
  const body = text.replace(/\s+$/, '')
  if (!body.trim()) return
  if (message(msgId)?.text !== body) local({ type: 'msg.edit', msgId, text: body })
}

export function deleteMessage(msgId) {
  local({ type: 'msg.delete', msgId })
}

export function setActive(threadId) {
  memo.activeId = threadId
  saveUI()
}

// ---- export / import ------------------------------------------------------

export function serializeMemos() {
  return JSON.stringify(
    { version: MEMO_SCHEMA, threads: snap(memo.threads), messages: snap(memo.messages) },
    null,
    2
  )
}

/** Merge a memo export into this device (union by id; nothing is removed). Returns records added. */
export function mergeMemos(raw) {
  if (!Array.isArray(raw?.threads) || !Array.isArray(raw?.messages)) throw new Error(t('invalidMemoFile'))
  let added = 0
  for (const th of raw.threads) {
    if (applyOp({ id: uid(), ts: th.createdAt ?? Date.now(), type: 'thread.add', threadId: th.id, title: th.title }))
      added++
    if (th.renamedAt) applyOp({ id: uid(), ts: th.renamedAt, type: 'thread.rename', threadId: th.id, title: th.title })
  }
  for (const m of raw.messages) {
    if (applyOp({ id: uid(), ts: m.ts, type: 'msg.add', msgId: m.id, threadId: m.threadId, text: m.text }))
      added++
    if (m.editedAt) applyOp({ id: uid(), ts: m.editedAt, type: 'msg.edit', msgId: m.id, text: m.text })
  }
  return added
}

// ---- init -----------------------------------------------------------------

async function init() {
  try {
    db = await openDB(DB_NAME, DB_VERSION, upgrade)
    const [threads, messages] = await Promise.all([idb.getAll(db, 'threads'), idb.getAll(db, 'messages')])
    memo.threads.push(...threads)
    memo.messages.push(...messages)
  } catch (e) {
    console.warn('[DASH] memos will not persist (IndexedDB unavailable):', e)
    memo.persistent = false
  }
  const saved = loadUI()
  memo.activeId = thread(saved.activeId) ? saved.activeId : null
  memo.ready = true
  memoSync.start({ apply: (op) => applyOp(op, { remote: true }), db })
}

$effect.root(() => {
  init()
})
