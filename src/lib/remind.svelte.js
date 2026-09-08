// Reminders (app only, see platform.scheduleReminders): the items the user
// ticked in the Reminders tab (item.remind, part of the board document so it
// travels with the board), sent as one notification at each time of day
// listed here (09:00 and 20:00 by default). Each time is one daily repeating
// notification, so reminders keep coming without the app open; the content
// is refreshed whenever the app runs. Delivery is inexact (the OS may hold
// one for up to an hour). The times live outside the board document, like
// ui prefs: they belong to this device.
import { library } from './store.svelte.js'
import { setView } from './ui.svelte.js'
import { t } from './i18n.svelte.js'
import { formatShort } from './date.js'
import { isNative, requestNotificationPermission, scheduleReminders, onNotificationTap } from './platform.js'

const KEY = 'dash-remind-v1'
const MAX_LINES = 8
export const MAX_TIMES = 24

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
  times: Array.isArray(saved.times) && saved.times.some(isTime) ? saved.times.filter(isTime).slice(0, MAX_TIMES) : ['09:00', '20:00'],
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

/** The listed times as minutes of the day: valid ones only, sorted, no repeats. */
export function slots(times = remind.times) {
  return [...new Set(times.filter(isTime).map(toMin))].sort((a, b) => a - b)
}

export function addTime() {
  if (remind.times.length >= MAX_TIMES) return
  // one hour after the latest listed time, so successive adds walk forward
  const last = slots().at(-1)
  const next = last == null ? 9 * 60 : (last + 60) % 1440
  remind.times.push(`${String(Math.floor(next / 60)).padStart(2, '0')}:${String(next % 60).padStart(2, '0')}`)
}

export function removeTime(i) {
  remind.times.splice(i, 1)
}

/** Every ticked item on every board, in board order. */
export function remindItems() {
  const list = []
  for (const b of library.boards)
    for (const p of b.projects) for (const it of p.items) if (it.remind) list.push({ text: it.text, due: it.due || null })
  return list
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
  const items = remindItems()
  if (!items.length) return []
  const lines = items.map((it) => `• ${it.text}${it.due ? ` (${formatShort(it.due)})` : ''}`)
  const shown = lines.slice(0, MAX_LINES)
  if (lines.length > MAX_LINES) shown.push(t('remindMore', { n: lines.length - MAX_LINES }))
  const title = t('remindNotifTitle', { n: items.length })
  const body = items.map((it) => it.text).join(', ')
  const largeBody = shown.join('\n')
  return slots().map((m) => ({
    title,
    body,
    largeBody,
    schedule: { on: { hour: Math.floor(m / 60), minute: m % 60 }, allowWhileIdle: true },
    extra: { view: 'remind' },
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
    if (extra?.view === 'remind') setView('remind')
  })
  $effect.root(() => {
    $effect(() => {
      const list = buildNotifications()
      const channel = { id: 'reminders', name: t('remindChannel'), description: t('remindChannelDesc') }
      const key = JSON.stringify({ list, channel })
      if (key === lastKey) return
      // edits to a picked item's text arrive one keystroke at a time
      clearTimeout(timer)
      timer = setTimeout(() => {
        lastKey = key
        scheduleReminders(list, channel).catch((e) => console.warn('[DASH] reminders:', e))
      }, 800)
    })
  })
}
