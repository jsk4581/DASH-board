import { cubicOut, cubicInOut } from 'svelte/easing'

// A small "pop" used when projects & items are CREATED.
// Pass { disabled: true } while drag-and-drop is in progress so reordering
// (which also adds/removes nodes from the list) doesn't pop.
export function pop(node, { disabled = false, duration = 180 } = {}) {
  if (disabled) return { duration: 0 }
  return {
    duration,
    css: (t) => {
      const e = cubicOut(t)
      return `transform: scale(${0.72 + 0.28 * e}); opacity: ${t}`
    },
  }
}

// Item DELETE: collapse the row's height (and fade) so the items below glide
// up to fill the gap in one continuous motion — no lingering full-size ghost,
// no height snap when the node finally unmounts. animate:flip on the siblings
// stays idle (their positions don't change until the height actually shrinks),
// so the collapse alone drives the reflow.
export function collapse(node, { disabled = false, duration = 200 } = {}) {
  if (disabled) return { duration: 0 }
  const h = node.offsetHeight
  return {
    duration,
    easing: cubicOut,
    css: (t) => `overflow: hidden; box-sizing: border-box; height: ${t * h}px; opacity: ${t};`,
  }
}

// Project DELETE: pin the leaving card where it stood (position:absolute,
// captured grid-relative offsets) so it is removed from grid auto-placement
// and can't be momentarily re-flowed to the grid's top-left corner (the flash).
// Requires the grid container to be `position: relative` (its offsetParent).
export function liftOut(node, { disabled = false, duration = 180 } = {}) {
  if (disabled) return { duration: 0 }
  // Svelte detaches the leaving grid cell before the outro setup runs, so its
  // own offset* read 0 here (→ a flash at the grid's top-left). The deleting
  // card therefore stamps its real grid-relative box onto data-g* BEFORE the
  // removal. If that stamp is absent (a removal that wasn't the trash button and
  // slipped past the swap guard — undo/redo, sync, etc.), just fade in place
  // rather than pinning to a wrong (0,0) position.
  const d = node.dataset
  if (d.gx == null) {
    return {
      duration,
      easing: cubicOut,
      css: (t) => `transform: scale(${0.9 + 0.1 * t}); opacity: ${t};`,
    }
  }
  const left = +d.gx,
    top = +d.gy,
    width = +d.gw,
    height = +d.gh
  return {
    duration,
    easing: cubicOut,
    css: (t) =>
      `position: absolute; left: ${left}px; top: ${top}px;` +
      `width: ${width}px; height: ${height}px; margin: 0;` +
      `box-sizing: border-box; transform-origin: center;` +
      `transform: scale(${0.9 + 0.1 * t}); opacity: ${t};` +
      `pointer-events: none; z-index: 1;`,
  }
}

// Timeline date paging: a real horizontal carousel slide. The outgoing panel is
// pinned (absolute) and slides fully off one side while the incoming panel slides
// in from the other. `dir` = +1 (next) / -1 (prev); `mode` = 'in' | 'out';
// `nav` = false on first paint so it doesn't slide on load.
export function hslide(node, { dir = 1, mode = 'in', duration = 300, nav = true } = {}) {
  if (!nav) return { duration: 0 }
  // freeze the outgoing panel's own height so the absolute pin doesn't let
  // taller rows (gantt) get clipped as it slides out
  const h = mode === 'out' ? node.offsetHeight : 0
  return {
    duration,
    easing: cubicInOut,
    // u === 1 - t (eased); u = 1 at the off-screen end.
    css: (t, u) => {
      const x = mode === 'in' ? dir * 100 * u : -dir * 100 * u
      const pin = mode === 'out' ? `position: absolute; top: 0; left: 0; width: 100%; height: ${h}px;` : ''
      return `${pin} transform: translateX(${x}%);`
    },
  }
}
