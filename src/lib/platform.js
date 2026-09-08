// ============================================================
// Platform bridge. In the browser this is inert; inside the
// Capacitor shell (the store app) it keeps a durable copy of the
// board in the app's private files, routes "save as file" through
// the share sheet (anchor downloads do nothing in a WebView) and
// exposes the hardware back button. Plugins are imported lazily so
// the web bundle never ships them.
// ============================================================

export const BOARD_KEY = 'dash-board-v1'
const BOARD_FILE = 'board.json'

export const isNative =
  typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.()

let fsMod = null
async function fs() {
  return (fsMod ??= await import('@capacitor/filesystem'))
}

/**
 * Before the app mounts: copy the on-disk board into localStorage so the
 * store's synchronous load sees it. The file is the durable copy; localStorage
 * stays the working mirror the rest of the app already reads.
 */
export async function hydrate() {
  if (!isNative) return
  try {
    const { Filesystem, Directory, Encoding } = await fs()
    const { data } = await Filesystem.readFile({
      path: BOARD_FILE,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    })
    if (typeof data === 'string' && data.length) localStorage.setItem(BOARD_KEY, data)
  } catch {
    /* first launch: no file yet */
  }
}

let persistTimer = null
let pendingSnapshot = null
/** Mirror every autosave into the board file (debounced; last write wins). */
export function persistBoard(snapshot) {
  if (!isNative) return
  pendingSnapshot = snapshot
  if (persistTimer) return
  persistTimer = setTimeout(async () => {
    persistTimer = null
    const data = pendingSnapshot
    pendingSnapshot = null
    try {
      const { Filesystem, Directory, Encoding } = await fs()
      await Filesystem.writeFile({ path: BOARD_FILE, data, directory: Directory.Data, encoding: Encoding.UTF8 })
    } catch (e) {
      console.warn('[DASH] board file write failed:', e)
    }
  }, 400)
}

/** "Save as file": a download in the browser, the share sheet in the app. */
export async function saveTextFile(name, text, title = name) {
  if (isNative) {
    const { Filesystem, Directory, Encoding } = await fs()
    const { Share } = await import('@capacitor/share')
    const { uri } = await Filesystem.writeFile({
      path: name,
      data: text,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    await Share.share({ title, files: [uri] })
    return
  }
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Share target: text another app sent to DASH ("Share" in a browser or
// YouTube). The store app receives it through a small native plugin
// (ShareTarget, in the Android project); on the web a `?share` query string
// with title/text/url does the same, so a PWA share_target can feed it.
// The handler gets { title, text, url } and may run more than once per session.
export function onShareReceived(handler) {
  if (isNative) {
    import('@capacitor/core').then(({ registerPlugin }) => {
      const ShareTarget = registerPlugin('ShareTarget')
      ShareTarget.addListener('share', (data) => handler(data))
      ShareTarget.getPending()
        .then((data) => {
          if (data?.text || data?.url) handler(data)
        })
        .catch(() => {})
    })
    return
  }
  try {
    const u = new URL(location.href)
    if (!u.searchParams.has('share')) return
    const data = { title: u.searchParams.get('title') ?? '', text: u.searchParams.get('text') ?? '', url: u.searchParams.get('url') ?? '' }
    for (const k of ['share', 'title', 'text', 'url']) u.searchParams.delete(k)
    history.replaceState(null, '', u.pathname + (u.search || '') + u.hash)
    if (data.text || data.url) handler(data)
  } catch {
    /* ignore */
  }
}

// Hardware back button: handlers run newest-first; the first to return true
// consumes the press. With none left to consume it, the app goes to the
// background (the usual Android expectation on a root screen).
const backHandlers = []
let backWired = false
export function onBackButton(handler) {
  backHandlers.unshift(handler)
  if (isNative && !backWired) {
    backWired = true
    import('@capacitor/app').then(({ App }) => {
      App.addListener('backButton', () => {
        for (const h of backHandlers) if (h()) return
        App.minimizeApp()
      })
    })
  }
  return () => {
    const i = backHandlers.indexOf(handler)
    if (i >= 0) backHandlers.splice(i, 1)
  }
}

// Highlight reminders (app only): the store's Highlights view, repeated as a
// notification on a daily grid of times. Each entry in `list` is one time of
// day; the plugin repeats it every day until we cancel it, so reminders keep
// coming even when the app is never opened. Inexact alarms are enough here
// (a reminder a few minutes late is fine) and need no special permission.
let lnMod = null
async function ln() {
  return (lnMod ??= await import('@capacitor/local-notifications'))
}
const REMIND_BASE = 7000
const REMIND_MAX = 100

export async function requestNotificationPermission() {
  if (!isNative) return false
  const { LocalNotifications } = await ln()
  let { display } = await LocalNotifications.checkPermissions()
  if (display !== 'granted') ({ display } = await LocalNotifications.requestPermissions())
  return display === 'granted'
}

/** Replace every scheduled reminder with `list` (empty list = none). */
export async function scheduleReminders(list, channel) {
  if (!isNative) return
  const { LocalNotifications } = await ln()
  const { notifications } = await LocalNotifications.getPending()
  const mine = notifications.filter((n) => n.id >= REMIND_BASE && n.id < REMIND_BASE + REMIND_MAX)
  if (mine.length) await LocalNotifications.cancel({ notifications: mine.map((n) => ({ id: n.id })) })
  if (!list.length) return
  await LocalNotifications.createChannel({ id: channel.id, name: channel.name, description: channel.description, importance: 3 })
  await LocalNotifications.schedule({
    notifications: list.slice(0, REMIND_MAX).map((n, i) => ({
      id: REMIND_BASE + i,
      channelId: channel.id,
      smallIcon: 'ic_stat_dash',
      isExactNotification: false,
      autoCancel: true,
      ...n,
    })),
  })
}

/** A tapped reminder: the handler gets the notification's `extra`. */
export function onNotificationTap(handler) {
  if (!isNative) return
  ln().then(({ LocalNotifications }) => {
    LocalNotifications.addListener('localNotificationActionPerformed', (e) => handler(e.notification?.extra ?? {}))
  })
}
