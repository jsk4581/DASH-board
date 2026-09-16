<script>
  import { dragHandleZone } from 'svelte-dnd-action'
  import { flip } from 'svelte/animate'
  import ProjectCard from './ProjectCard.svelte'
  import Big3Card from './Big3Card.svelte'
  import Icon from './Icon.svelte'
  import { board, addProject, setProjects, swapping, BIG3_SCOPES } from '../store.svelte.js'

  // the Big 3 row on a phone: one card per page, flicked, with dots under it
  const BIG3_NAME = { day: 'big3', month: 'big3Month', year: 'big3Year' }
  let row = $state(null)
  let page = $state(0)
  function onRowScroll() {
    if (!row) return
    const kids = [...row.children]
    let best = 0
    kids.forEach((k, i) => {
      if (Math.abs(k.offsetLeft - row.scrollLeft) < Math.abs(kids[best].offsetLeft - row.scrollLeft)) best = i
    })
    page = best
  }
  function goPage(i) {
    const k = row?.children[i]
    if (k) row.scrollTo({ left: k.offsetLeft, behavior: 'smooth' })
  }
  import { pop, liftOut } from '../pop.js'
  import { t } from '../i18n.svelte.js'

  // focus: every project shows only its starred items, and projects without
  // one are left out; nothing is added or reordered while it is on
  let { editing = true, focus = false } = $props()

  const starred = (p) => p.items.filter((it) => it.status === 'highlight')
  const shown = $derived(focus ? board.projects.filter((p) => starred(p).length > 0) : board.projects)

  const FLIP = 200
  // suppress the pop while dragging (reorder adds/removes nodes too)
  let dragging = $state(false)

  // a card moved to another board: the card is gone, so the board says where
  let toast = $state('')
  let toastTimer
  function flash(msg) {
    toast = msg
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toast = ''), 2400)
  }

  function handleConsider(e) {
    dragging = true
    setProjects(e.detail.items)
  }
  function handleFinalize(e) {
    setProjects(e.detail.items)
    dragging = false
  }
</script>

<section class="board">
  <!-- the Big 3 (daily, monthly, yearly): card-sized cells pinned above
       every board, in a row on a wide screen and flicked one page at a time
       on a phone, with a dot per card underneath -->
  <div class="pinned">
    <div class="pinned-row" bind:this={row} onscroll={onRowScroll}>
      {#each BIG3_SCOPES as scope (scope)}
        <Big3Card {editing} {scope} />
      {/each}
    </div>
    <div class="dots" role="tablist">
      {#each BIG3_SCOPES as scope, i (scope)}
        <button class="dot" class:on={page === i} role="tab" aria-selected={page === i} aria-label={t(BIG3_NAME[scope])} onclick={() => goPage(i)}></button>
      {/each}
    </div>
  </div>
  <div
    class="grid"
    use:dragHandleZone={{
      items: shown,
      type: 'projects',
      dragDisabled: !editing || focus,
      flipDurationMs: FLIP,
      dropTargetStyle: {},
    }}
    onconsider={handleConsider}
    onfinalize={handleFinalize}
  >
    {#each shown as project (project.id)}
      <div
        class="cell"
        animate:flip={{ duration: FLIP }}
        in:pop={{ disabled: dragging || swapping.on }}
        out:liftOut={{ disabled: dragging || swapping.on }}
      >
        <ProjectCard {project} {editing} {focus} onmoved={flash} />
      </div>
    {/each}
  </div>

  {#if focus && shown.length === 0}
    <p class="empty-board">{t('focusEmpty')}</p>
  {:else if board.projects.length === 0 && !editing}
    <p class="empty-board">{t('boardEmpty')}</p>
  {/if}

  {#if editing && !focus}
    <button class="add-project" onclick={() => addProject(t('newProject'))}>
      <Icon name="plus" size={17} />
      {t('newProject')}
    </button>
  {/if}
</section>

{#if toast}
  <div class="toast">{toast}</div>
{/if}

<style>
  .board {
    padding: 18px clamp(14px, 3vw, 32px) 8px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 14px;
    align-items: start;
    position: relative; /* offsetParent for a leaving card pinned by liftOut */
  }
  .cell {
    min-width: 0;
  }

  /* the same column template as the grid, so each Big 3 card is card-sized;
     a faint rule under the row sets it apart from the board's own cards */
  .pinned {
    margin-bottom: 14px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--border);
  }
  .pinned-row {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 14px;
  }
  .dots {
    display: none;
  }

  .add-project {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    width: 100%;
    margin-top: 14px;
    padding: 13px;
    border: 1.5px dashed var(--border-strong);
    border-radius: var(--radius);
    color: var(--text-muted);
    font-size: 14.5px;
    font-weight: 550;
    background: transparent;
    transition: border-color var(--med) var(--ease), color var(--med) var(--ease),
      background var(--med) var(--ease);
  }
  .add-project:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-soft);
  }

  .empty-board {
    text-align: center;
    color: var(--text-faint);
    padding: 40px 0;
  }

  .toast {
    position: fixed;
    bottom: calc(20px + var(--safe-bottom));
    left: 50%;
    transform: translateX(-50%);
    background: var(--text);
    color: var(--bg);
    font-size: 14px;
    font-weight: 600;
    padding: 9px 16px;
    border-radius: 99px;
    box-shadow: var(--shadow-pop);
    z-index: 2000;
    max-width: calc(100vw - 32px);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 560px) {
    .grid {
      grid-template-columns: 1fr;
    }
    /* one Big 3 card per page, a flick turns exactly one page */
    .pinned-row {
      display: flex;
      align-items: stretch; /* the cards share the row's height */
      gap: 14px;
      overflow-x: auto;
      overscroll-behavior-x: contain;
      scroll-snap-type: x mandatory;
      scrollbar-width: none;
    }
    .pinned-row::-webkit-scrollbar {
      display: none;
    }
    .pinned-row > :global(.card) {
      flex: none;
      width: 100%;
      scroll-snap-align: start;
      scroll-snap-stop: always;
    }
    .dots {
      display: flex;
      justify-content: center;
      gap: 7px;
      padding-top: 10px;
    }
    .dot {
      width: 5px;
      height: 5px;
      padding: 0;
      border-radius: 50%;
      background: var(--border-strong);
      transition: background var(--fast) var(--ease), transform var(--fast) var(--ease);
    }
    .dot.on {
      background: var(--text-muted);
      transform: scale(1.2);
    }
  }
</style>
