<script>
  import Toolbar from './lib/components/Toolbar.svelte'
  import Board from './lib/components/Board.svelte'
  import Timeline from './lib/components/Timeline.svelte'
  import { ui } from './lib/ui.svelte.js'
  import { undo, redo } from './lib/history.svelte.js'

  const editing = $derived(ui.mode === 'edit')

  function onKeydown(e) {
    const mod = e.ctrlKey || e.metaKey
    if (!mod) return
    const k = e.key.toLowerCase()
    if (k === 'z' && !e.shiftKey) {
      e.preventDefault()
      undo()
    } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
      e.preventDefault()
      redo()
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<Toolbar />

<main class:editing>
  <Board {editing} />
  <Timeline {editing} />
</main>

<!-- shared "colored-pencil" roughening filter for the 강조 grading circle -->
<svg class="defs" aria-hidden="true" width="0" height="0">
  <filter id="pencil-rough" x="-6%" y="-20%" width="112%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency="0.022 0.05" numOctaves="2" seed="7" result="n" />
    <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
  </filter>
</svg>

<style>
  main {
    max-width: 1480px;
    margin: 0 auto;
    padding-bottom: 24px;
  }
  .defs {
    position: absolute;
    width: 0;
    height: 0;
    overflow: hidden;
  }
</style>
