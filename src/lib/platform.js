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
