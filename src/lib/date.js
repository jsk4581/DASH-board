// Date helpers — the timeline horizon is "today + N days".

import { ui } from './ui.svelte.js'

export const HORIZON_DAYS = 14

const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토']
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Localised single weekday label for a day-of-week index (0=Sun). */
export function weekdayLabel(dow) {
  return (ui.lang === 'en' ? WEEKDAYS_EN : WEEKDAYS_KO)[dow]
}

/** Localised weekday header row, Sunday-first. */
export function weekdayNames() {
  return ui.lang === 'en' ? WEEKDAYS_EN : WEEKDAYS_KO
}

/** Localised month label e.g. "6월" / "Jun". */
export function monthLabel(month) {
  return ui.lang === 'en' ? MONTHS_EN[month - 1] : `${month}월`
}

/** Local midnight for a given date (defaults to now). */
export function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** 'YYYY-MM-DD' in local time (not UTC, so the day never shifts). */
export function toISODate(d) {
  const x = startOfDay(d)
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse 'YYYY-MM-DD' back to a local Date at midnight. */
export function fromISODate(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO() {
  return toISODate(new Date())
}

/** Whole-day difference b - a (both ISO or Date). */
export function dayDiff(a, b) {
  const da = startOfDay(a instanceof Date ? a : fromISODate(a))
  const db = startOfDay(b instanceof Date ? b : fromISODate(b))
  return Math.round((db - da) / 86_400_000)
}

export function addDays(d, n) {
  const x = startOfDay(d instanceof Date ? d : fromISODate(d))
  x.setDate(x.getDate() + n)
  return x
}

/** The list of days that make up the timeline, starting today. */
export function horizon(days = HORIZON_DAYS, from = new Date()) {
  const base = startOfDay(from)
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(base, i)
    return {
      iso: toISODate(date),
      date,
      day: date.getDate(),
      month: date.getMonth() + 1,
      weekday: WEEKDAYS_KO[date.getDay()],
      dow: date.getDay(),
      isToday: toISODate(date) === todayISO(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isFirstOfMonth: date.getDate() === 1,
    }
  })
}

export function weekdayKo(iso) {
  const d = fromISODate(iso)
  return d ? WEEKDAYS_KO[d.getDay()] : ''
}

/** Short human label e.g. "6월 21일 (토)" / "Jun 21 (Sat)". */
export function formatLabel(iso) {
  const d = fromISODate(iso)
  if (!d) return ''
  const wd = weekdayLabel(d.getDay())
  if (ui.lang === 'en') return `${MONTHS_EN[d.getMonth()]} ${d.getDate()} (${wd})`
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${wd})`
}

/** Compact date stamp e.g. "6/21". */
export function formatShort(iso) {
  const d = fromISODate(iso)
  if (!d) return ''
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** Relative tag for a due date, used on chips ("오늘"/"Today", "D-3", "D+1"). */
export function relativeTag(iso) {
  if (!iso) return ''
  const n = dayDiff(new Date(), iso)
  if (ui.lang === 'en') {
    if (n === 0) return 'Today'
    if (n === 1) return 'Tomorrow'
    return n < 0 ? `D+${-n}` : `D-${n}`
  }
  if (n === 0) return '오늘'
  if (n === 1) return '내일'
  return n < 0 ? `D+${-n}` : `D-${n}`
}
