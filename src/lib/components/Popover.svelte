<script>
  import { onMount, tick } from 'svelte'
  import { scale } from 'svelte/transition'

  let { anchor, onclose, placement = 'bottom-start', children } = $props()

  let panel = $state(null)
  let pos = $state({ left: 0, top: 0 })

  function place() {
    if (!anchor || !panel) return
    const r = anchor.getBoundingClientRect()
    const pw = panel.offsetWidth
    const ph = panel.offsetHeight
    const gap = 6
    const vw = window.innerWidth
    const vh = window.innerHeight

    let left = placement.endsWith('end') ? r.right - pw : r.left
    let top = placement.startsWith('top') ? r.top - ph - gap : r.bottom + gap

    // keep within viewport
    left = Math.min(Math.max(8, left), vw - pw - 8)
    if (top + ph > vh - 8) top = r.top - ph - gap // flip up
    if (top < 8) top = r.bottom + gap
    pos = { left, top }
  }

  function onPointerDown(e) {
    if (panel && !panel.contains(e.target) && anchor && !anchor.contains(e.target)) {
      onclose?.()
    }
  }
  function onKey(e) {
    if (e.key === 'Escape') onclose?.()
  }

  onMount(async () => {
    await tick()
    place()
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  })
</script>

<div
  class="popover"
  bind:this={panel}
  style="left:{pos.left}px; top:{pos.top}px;"
  transition:scale={{ duration: 140, start: 0.94, opacity: 0 }}
  role="dialog"
>
  {@render children()}
</div>

<style>
  .popover {
    position: fixed;
    z-index: 1000;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-pop);
    padding: 10px;
    transform-origin: top left;
  }
</style>
