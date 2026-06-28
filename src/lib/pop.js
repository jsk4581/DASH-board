import { cubicOut } from 'svelte/easing'

// A small "pop" used when projects & items are created or deleted.
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
