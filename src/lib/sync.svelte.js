// ============================================================
// Optional GitHub Gist sync — cross-device persistence, no backend.
// The board lives in a private gist; localStorage stays as the
// offline cache. Pull on startup, debounced push on change.
// Single-user, last-write-wins, with a guard for offline edits.
// ============================================================

import { toJSON, replaceBoard } from './store.svelte.js'

const CFG_KEY = 'dash-sync-v1'
const FILENAME = 'dash-board.json'
const API = 'https://api.github.com'
const PUSH_DEBOUNCE = 1600

// reactive status for the UI
export const sync = $state({
  connected: false,
  status: 'idle', // idle | syncing | synced | error | offline | conflict
  error: '',
  gistId: null,
  lastSyncedAt: null,
})

let token = null
let gistId = null
let lastPushed = null // content known to match the remote
let hydrating = false // true while applying a pulled snapshot (suppress push)
let timer = null

// ---- config persistence (token lives only in this browser) ----
function loadCfg() {
  try {
    const r = localStorage.getItem(CFG_KEY)
    if (r) return JSON.parse(r)
  } catch {
    /* ignore */
  }
  return {}
}
function saveCfg(extra = {}) {
  try {
    localStorage.setItem(CFG_KEY, JSON.stringify({ token, gistId, ...extra }))
  } catch {
    /* ignore */
  }
}
function clearCfg() {
  try {
    localStorage.removeItem(CFG_KEY)
  } catch {
    /* ignore */
  }
}

// cheap content fingerprint (djb2) — "did local change since last sync?"
function fp(s) {
  let h = 5381
  let i = s.length
  while (i) h = (h * 33) ^ s.charCodeAt(--i)
  return (h >>> 0).toString(36)
}

function setStatus(status, error = '') {
  sync.status = status
  sync.error = error
}

function markSynced(content) {
  lastPushed = content
  sync.lastSyncedAt = Date.now()
  setStatus('synced')
  saveCfg({ syncedFp: fp(content) })
}

function netStatus() {
  return typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error'
}

async function gh(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
  if (!res.ok) {
    const code =
      res.status === 401
        ? 'bad-token'
        : res.status === 404
          ? 'no-gist'
          : res.status === 403
            ? 'forbidden'
            : `http-${res.status}`
    throw new Error(code)
  }
  return res.json()
}

function remoteContent(gist) {
  const f = gist.files?.[FILENAME] ?? Object.values(gist.files ?? {})[0]
  return f?.content ?? null
}

function applyContent(content) {
  hydrating = true
  replaceBoard(JSON.parse(content))
  queueMicrotask(() => {
    hydrating = false
  })
}

// ---- public API ----

/** First device: token only → create a private gist. Other devices: token + gistId → load it. */
export async function connect({ token: tk, gistId: gid }) {
  token = (tk || '').trim()
  gistId = (gid || '').trim() || null
  if (!token) {
    setStatus('error', 'no-token')
    return false
  }
  setStatus('syncing')
  try {
    if (gistId) {
      const gist = await gh(`/gists/${gistId}`)
      const content = remoteContent(gist)
      if (content == null) throw new Error('empty-gist')
      applyContent(content)
      sync.connected = true
      sync.gistId = gistId
      markSynced(content)
    } else {
      const content = toJSON()
      const gist = await gh('/gists', {
        method: 'POST',
        body: JSON.stringify({
          description: 'DASH — board data (synced)',
          public: false,
          files: { [FILENAME]: { content } },
        }),
      })
      gistId = gist.id
      sync.connected = true
      sync.gistId = gistId
      markSynced(content)
    }
    return true
  } catch (e) {
    setStatus('error', e.message)
    sync.connected = false
    return false
  }
}

/** Take the remote copy (discard local differences). Also resolves a conflict toward the cloud. */
export async function pull() {
  if (!sync.connected) return
  setStatus('syncing')
  try {
    const gist = await gh(`/gists/${gistId}`)
    const content = remoteContent(gist)
    if (content == null) throw new Error('empty-gist')
    applyContent(content)
    markSynced(content)
  } catch (e) {
    setStatus(netStatus(), e.message)
  }
}

/** Push local to the remote (discard remote differences). Also resolves a conflict toward this device. */
export async function pushNow() {
  if (!sync.connected) return
  const content = toJSON()
  if (content === lastPushed && sync.status !== 'conflict') {
    setStatus('synced')
    return
  }
  setStatus('syncing')
  try {
    await gh(`/gists/${gistId}`, {
      method: 'PATCH',
      body: JSON.stringify({ files: { [FILENAME]: { content } } }),
    })
    markSynced(content)
  } catch (e) {
    setStatus(netStatus(), e.message)
  }
}

export function disconnect() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  token = null
  gistId = null
  lastPushed = null
  clearCfg()
  sync.connected = false
  sync.gistId = null
  sync.lastSyncedAt = null
  setStatus('idle')
}

// ---- init + autosync ----
$effect.root(() => {
  const cfg = loadCfg()
  if (cfg.token && cfg.gistId) {
    token = cfg.token
    gistId = cfg.gistId
    lastPushed = toJSON()
    sync.connected = true
    sync.gistId = gistId
    startupSync(cfg.syncedFp)
  }

  // debounced push whenever the board changes
  $effect(() => {
    const content = toJSON() // deep-tracks the whole board
    if (!sync.connected || hydrating) return
    if (sync.status === 'conflict') return // wait for explicit resolution
    if (content === lastPushed) return
    if (timer) clearTimeout(timer)
    setStatus('syncing')
    timer = setTimeout(pushNow, PUSH_DEBOUNCE)
  })
})

async function startupSync(syncedFp) {
  setStatus('syncing')
  const local = toJSON()
  const localUnsynced = syncedFp != null && fp(local) !== syncedFp
  try {
    const gist = await gh(`/gists/${gistId}`)
    const remote = remoteContent(gist)
    if (remote == null) {
      await pushNow() // empty remote → seed it from local
      return
    }
    if (remote === local) {
      markSynced(local)
      return
    }
    if (localUnsynced) {
      setStatus('conflict') // both sides changed since last sync → ask the user
      return
    }
    applyContent(remote) // local clean, remote newer → take remote
    markSynced(remote)
  } catch (e) {
    setStatus(netStatus(), e.message)
  }
}
