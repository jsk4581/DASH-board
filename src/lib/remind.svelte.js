// Highlight reminders (app only, see platform.scheduleReminders): every item
// circled in red, from every board, sent as a notification on a daily grid of
// times. The grid starts when quiet hours end and repeats every `every`
// minutes until they begin again (with no quiet hours it starts at midnight),
// so "every 3 hours, quiet 22:00 to 08:00" means 08:00, 11:00, 14:00, 17:00
// and 20:00. Delivery is inexact (the OS may hold one for up to an hour). The settings live outside the board document, like ui prefs.
import { library } from './store.svelte.js'
import { setView } from './ui.svelte.js'
import { t } from './i18n.svelte.js'
import { formatShort } from './date.js'
import { isNative, requestNotificationPermission, scheduleReminders, onNotificationTap } from './platform.js'

const KEY = 'dash-remind-v1'
export const EVERY_OPTIONS = [30, 60, 120, 180, 240, 360, 720, 1440]
const MAX_LINES = 8

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return {}
}
const isTime = (s) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s)
const saved = load()

export const remind = $state({
  enabled: saved.enabled === true,
  every: EVERY_OPTIONS.includes(saved.every) ? saved.every : 180,
  quiet: saved.quiet !== false,
  quietStart: isTime(saved.quietStart) ? saved.quietStart : '22:00',
  quietEnd: isTime(saved.quietEnd) ? saved.quietEnd : '08:00',
})
// not persisted: whether the last attempt to turn reminders on was refused
export const remindStatus = $state({ denied: false })

$effect.root(() => {
  $effect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify($state.snapshot(remind)))
    } catch {
      /* ignore */
    }
  })
})

const toMin = (s) => {
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}
const pad = (n) => String(n).padStart(2, '0')
export const fmtMin = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`

/** Minutes of the day at which a reminder fires, sorted. */
export function slotsFor(s = remind) {
  const start = s.quiet ? toMin(s.quietEnd) : 0
  let span = s.quiet ? (toMin(s.quietStart) - start + 1440) % 1440 : 1440
  if (span === 0) span = 1440 // quiet hours that start when they end: none
  // Android delivers these inexact alarms up to an hour late, so keep the
  // last slot an hour clear of quiet hours (the first slot always stays)
  const last = s.quiet ? span - 60 : span - 1
  const out = [start]
  for (let k = 1; k * s.every <= last && out.length < 48; k++) out.push((start + k * s.every) % 1440)
  return out.sort((a, b) => a - b)
}

/** Every highlighted item on every board, dated ones first. */
export function highlightItems() {
  const list = []
  for (const b of library.boards)
    for (const p of b.projects) for (const it of p.items) if (it.status === 'highlight') list.push({ text: it.text, due: it.due || null })
  return list.sort((a, b) => (a.due && b.due ? a.due.localeCompare(b.due) : a.due ? -1 : b.due ? 1 : 0))
}

/** Turn reminders on (asks for the notification permission first) or off. */
export async function setRemindEnabled(on) {
  if (!on) {
    remind.enabled = false
    return
  }
  const ok = await requestNotificationPermission()
  remindStatus.denied = !ok
  remind.enabled = ok
}

function buildNotifications() {
  if (!remind.enabled) return []
  const items = highlightItems()
  if (!items.length) return []
  const lines = items.map((it) => `• ${it.text}${it.due ? ` (${formatShort(it.due)})` : ''}`)
  const shown = lines.slice(0, MAX_LINES)
  if (lines.length > MAX_LINES) shown.push(t('remindMore', { n: lines.length - MAX_LINES }))
  const title = t('remindNotifTitle', { n: items.length })
  const body = items.map((it) => it.text).join(', ')
  const largeBody = shown.join('\n')
  return slotsFor().map((m) => ({
    title,
    body,
    largeBody,
    schedule: { on: { hour: Math.floor(m / 60), minute: m % 60 }, allowWhileIdle: true },
    extra: { view: 'star' },
  }))
}

let wired = false
let timer = null
let lastKey = null
/** Keep the scheduled notifications in step with the settings and the boards. */
export function initRemind() {
  if (wired || !isNative) return
  wired = true
  onNotificationTap((extra) => {
    if (extra?.view === 'star') setView('star')
  })
  $effect.root(() => {
    $effect(() => {
      const list = buildNotifications()
      const channel = { id: 'highlights', name: t('remindChannel'), description: t('remindChannelDesc') }
      const key = JSON.stringify({ list, channel })
      if (key === lastKey) return
      // edits to a highlighted item's text arrive one keystroke at a time
      clearTimeout(timer)
      timer = setTimeout(() => {
        lastKey = key
        scheduleReminders(list, channel).catch((e) => console.warn('[DASH] reminders:', e))
      }, 800)
    })
  })
}
