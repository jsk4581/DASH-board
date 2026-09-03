<script>
  import Toolbar from './lib/components/Toolbar.svelte'
  import Board from './lib/components/Board.svelte'
  import Timeline from './lib/components/Timeline.svelte'
  import MemoView from './lib/components/MemoView.svelte'
  import DoneBoard from './lib/components/DoneBoard.svelte'
  import { ui, setTouchItem } from './lib/ui.svelte.js'
  import { undo, redo } from './lib/history.svelte.js'

  const editing = $derived(ui.mode === 'edit')

  function onKeydown(e) {
    if (ui.view === 'memo') return // memo composer keeps the browser's own text undo
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

  // Touch tap-to-reveal: on a no-hover device, tapping inside an item reveals its
  // action pill; tapping anywhere else clears it. No-op on pointer-capable
  // devices (hover already handles reveal, and CSS ignores the state there).
  function onPointerDown(e) {
    if (!matchMedia('(hover: none)').matches) return
    const el = e.target?.closest?.('.item[data-item-id]')
    setTouchItem(el ? el.dataset.itemId : null)
  }
</script>

<svelte:window onkeydown={onKeydown} onpointerdown={onPointerDown} />

<Toolbar />

{#if ui.view === 'memo'}
  <main class="memo-main">
    <MemoView />
  </main>
{:else if ui.view === 'done'}
  <main class:editing>
    <DoneBoard {editing} />
  </main>
{:else}
  <main class:editing>
    <Board {editing} />
    <Timeline {editing} />
  </main>
{/if}

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
    padding-bottom: calc(24px + var(--safe-bottom));
  }
  /* the chat view owns the rest of the viewport under the sticky toolbar */
  main.memo-main {
    height: calc(100dvh - var(--bar-h, 56px));
    padding-bottom: 0;
  }
  .defs {
    position: absolute;
    width: 0;
    height: 0;
    overflow: hidden;
  }
</style>
