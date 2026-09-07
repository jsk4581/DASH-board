// Incoming shares (see platform.onShareReceived): the pending one is shown by
// ShareSheet until the user picks a memo thread or dismisses it.
import { onShareReceived } from './platform.js'

export const share = $state({ pending: null })

/** One message body out of what the sender gave us. */
export function shareBody({ title = '', text = '', url = '' } = {}) {
  const parts = []
  const t = title.trim(), x = text.trim(), u = url.trim()
  if (t && !x.includes(t)) parts.push(t)
  if (x) parts.push(x)
  if (u && !x.includes(u)) parts.push(u)
  return parts.join('\n')
}

let wired = false
export function initShare() {
  if (wired) return
  wired = true
  onShareReceived((data) => {
    const body = shareBody(data)
    if (body) share.pending = { ...data, body }
  })
}
