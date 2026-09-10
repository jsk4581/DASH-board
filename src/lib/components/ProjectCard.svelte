<script>
  import { dragHandleZone, dragHandle } from 'svelte-dnd-action'
  import { flip } from 'svelte/animate'
  import Icon from './Icon.svelte'
  import TodoItem from './TodoItem.svelte'
  import Popover from './Popover.svelte'
  import {
    addItem,
    restoreItem,
    purgeItem,
    removeProject,
    renameProject,
    setProjectColor,
    setItems,
    PALETTE,
    swapping,
  } from '../store.svelte.js'
  import { pop, collapse } from '../pop.js'
  import { formatShort } from '../date.js'
  import { t } from '../i18n.svelte.js'

  // focus: only the starred items, no adding or reordering
  let { project, editing = true, focus = false } = $props()
  const shown = $derived(focus ? project.items.filter((it) => it.status === 'highlight') : project.items)
  const canAdd = $derived(editing && !focus)

  const FLIP = 180
  let autofocusId = $state(null)
  let colorBtn = $state(null)
  let showColor = $state(false)
  // suppress the pop while dragging (reorder adds/removes nodes too)
  let dragging = $state(false)

  const done = $derived(project.items.filter((i) => i.status === 'done').length)

  // Completed: the items deleted after being checked off, listed in the card
  // in place of the open items, oldest added first (an item from before the
  // added date existed sorts by the day it was completed)
  let showDone = $state(false)
  const completed = $derived(
    [...project.archive].sort((a, b) => (a.created ?? a.archivedAt ?? '').localeCompare(b.created ?? b.archivedAt ?? ''))
  )

  function handleConsider(e) {
    dragging = true
    setItems(project.id, e.detail.items)
  }
  function handleFinalize(e) {
    setItems(project.id, e.detail.items)
    dragging = false
  }

  function add() {
    const it = addItem(project.id)
    autofocusId = it.id
  }

  // Stamp the card's grid-relative box onto the .cell wrapper BEFORE removal, so
  // the liftOut out-transition can pin the leaving card where it actually sat
  // (Svelte detaches it before the outro, where offset* would read 0 → top-left flash).
  function delProject(e) {
    const cell = e.currentTarget.closest('.cell')
    const grid = cell?.parentElement
    if (cell && grid) {
      const r = cell.getBoundingClientRect()
      const g = grid.getBoundingClientRect()
      cell.dataset.gx = r.left - g.left
      cell.dataset.gy = r.top - g.top
      cell.dataset.gw = r.width
      cell.dataset.gh = r.height
      // hold the grid's height while the (possibly last) card lifts out so the
      // "New project" button below doesn't jump up; release after the outro.
      grid.style.minHeight = g.height + 'px'
      setTimeout(() => (grid.style.minHeight = ''), 220)
    }
    removeProject(project.id)
  }
</script>

<article class="card" style="--card-accent: {project.color};">
  <header class="card-head">
    {#if canAdd}
      <span class="card-grip" use:dragHandle title={t('dragMove')} aria-label={t('projectGrip')}>
        <Icon name="grip" size={16} />
      </span>
    {/if}
    <button
      class="color-dot"
      bind:this={colorBtn}
      onclick={() => editing && (showColor = !showColor)}
      disabled={!editing}
      title={t('changeColor')}
      aria-label={t('projectColor')}
    ></button>

    {#if editing}
      <input
        class="title-input"
        value={project.title}
        placeholder={t('projectNamePlaceholder')}
        oninput={(e) => renameProject(project.id, e.target.value)}
        onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
    {:else}
      <h2 class="title">{project.title}</h2>
    {/if}

    <span class="count" title={t('doneTotal')}>{done}/{project.items.length}</span>

    {#if editing}
      <div class="head-actions">
        <button
          class="icon-btn"
          class:on={showDone}
          title={t('doneTab')}
          aria-label={t('doneTab')}
          aria-pressed={showDone}
          onclick={() => (showDone = !showDone)}
        >
          <Icon name="checkCircle" size={16} />
        </button>
        {#if canAdd}
          <button
            class="icon-btn danger"
            title={t('deleteProject')}
            aria-label={t('deleteProject')}
            onclick={delProject}
          >
            <Icon name="trash" size={15} />
          </button>
        {/if}
      </div>
    {/if}
  </header>

  <div
    class="list"
    class:empty={shown.length === 0}
    use:dragHandleZone={{
      items: shown,
      type: 'items',
      dragDisabled: !canAdd,
      flipDurationMs: FLIP,
      dropTargetStyle: {},
    }}
    onconsider={handleConsider}
    onfinalize={handleFinalize}
  >
    {#each shown as item (item.id)}
      <div
        class="item-wrap"
        animate:flip={{ duration: FLIP }}
        in:pop={{ disabled: dragging || swapping.on }}
        out:collapse={{ disabled: dragging || swapping.on }}
      >
        <TodoItem
          pid={project.id}
          {item}
          {editing}
          autofocus={item.id === autofocusId}
          onenter={add}
        />
      </div>
    {/each}

    {#if project.items.length === 0 && canAdd}
      <button class="empty-hint" onclick={add}>{t('addFirstItem')}</button>
    {/if}
  </div>

  <!-- Completed: the done-and-deleted items run on under the open ones -->
  {#if showDone}
    <ul class="done-list">
      {#each completed as it (it.id)}
        <li class="done-row" class:highlight={it.status === 'highlight'}>
          <span class="tick"><Icon name="check" size={12} strokeWidth={3} /></span>
          <span class="done-text">{it.text}</span>
          {#if it.created ?? it.archivedAt}<span class="when">{formatShort(it.created ?? it.archivedAt)}</span>{/if}
          <span class="done-acts">
            <button class="icon-btn" title={t('restoreItem')} aria-label={t('restoreItem')} onclick={() => restoreItem(project.id, it.id)}>
              <Icon name="undo" size={13} />
            </button>
            <button class="icon-btn danger" title={t('deleteForever')} aria-label={t('deleteForever')} onclick={() => purgeItem(project.id, it.id)}>
              <Icon name="trash" size={13} />
            </button>
          </span>
        </li>
      {:else}
        <li class="done-none">{t('doneEmpty')}</li>
      {/each}
    </ul>
  {/if}

  {#if canAdd && project.items.length > 0}
    <footer class="card-foot">
      <button class="add-row" onclick={add}>
        <Icon name="plus" size={15} /> {t('addItem')}
      </button>
    </footer>
  {/if}
</article>

{#if showColor}
  <Popover anchor={colorBtn} onclose={() => (showColor = false)} placement="bottom-start">
    <div class="swatches">
      {#each PALETTE as c}
        <button
          class="swatch"
          class:active={project.color === c}
          style="background:{c}"
          aria-label={t('colorNamed', { c })}
          onclick={() => {
            setProjectColor(project.id, c)
            showColor = false
          }}
        ></button>
      {/each}
    </div>
  </Popover>
{/if}

<style>
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: box-shadow var(--med) var(--ease), border-color var(--med) var(--ease);
  }
  .card:hover {
    box-shadow: var(--shadow-md);
  }
  /* accent strip on the left edge */
  .card-head {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 11px 10px 9px 13px;
    border-bottom: 1px solid var(--border);
    position: relative;
  }
  .card-head::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--card-accent);
  }

  .card-grip {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 -3px 0 -6px;
    color: var(--text-faint);
    cursor: grab;
    touch-action: none;
    opacity: 0;
    transition: opacity var(--fast) var(--ease);
  }
  .card-grip:active {
    cursor: grabbing;
  }
  .card:hover .card-grip {
    opacity: 1;
  }
  @media (hover: none) {
    .card-grip {
      opacity: 1;
    }
  }

  .color-dot {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: var(--card-accent);
    flex: none;
    transition: transform var(--fast) var(--ease);
  }
  .color-dot:hover:not(:disabled) {
    transform: scale(1.25);
  }

  .title,
  .title-input {
    flex: 1;
    min-width: 0;
    font-size: 15px;
    font-weight: 650;
    margin: 0;
    border: none;
    outline: none;
    background: transparent;
    color: var(--text);
    border-radius: var(--radius-xs);
    padding: 2px 4px;
    margin-left: -4px;
  }
  .title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .title-input:focus {
    background: var(--surface-hover);
  }
  .title-input::placeholder {
    color: var(--text-faint);
    font-weight: 500;
  }

  /* the count and the tools surface together on hover */
  .count {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
    flex: none;
    opacity: 0;
    transition: opacity var(--fast) var(--ease);
  }
  .head-actions {
    display: flex;
    gap: 1px;
    flex: none;
    opacity: 0;
    transform: translateX(4px);
    transition: opacity var(--fast) var(--ease), transform var(--fast) var(--ease);
  }
  .card:hover .count,
  .card:focus-within .count,
  .card:hover .head-actions,
  .card:focus-within .head-actions {
    opacity: 1;
    transform: none;
  }
  .head-actions .icon-btn.on {
    color: var(--accent-ink);
    background: var(--accent-soft);
  }

  .done-list {
    list-style: none;
    margin: 0;
    padding: 0 6px 6px;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .done-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 6px 6px 8px;
    border-radius: var(--radius-xs);
    min-height: 34px;
  }
  .done-row:hover {
    background: var(--surface-hover);
  }
  .tick {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--done);
    color: var(--surface);
    flex: none;
  }
  .done-text {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    color: var(--done);
    text-decoration: line-through;
    overflow-wrap: anywhere;
  }
  .done-row.highlight .done-text {
    font-weight: 700;
  }
  .when {
    font-size: 11.5px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
    flex: none;
  }
  .done-acts {
    display: flex;
    gap: 1px;
    flex: none;
    opacity: 0;
    transition: opacity var(--fast) var(--ease);
  }
  .done-row:hover .done-acts,
  .done-row:focus-within .done-acts {
    opacity: 1;
  }
  @media (hover: none) {
    .done-acts {
      opacity: 1;
    }
  }
  .done-acts .icon-btn.danger:hover {
    color: #d92d2d;
  }
  .done-none {
    padding: 8px 10px;
    color: var(--text-faint);
    font-size: 13.5px;
  }

  .list {
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 1;
  }
  .list.empty {
    padding: 6px;
    min-height: 44px;
  }
  .item-wrap {
    outline: none;
  }

  .empty-hint {
    width: 100%;
    text-align: left;
    padding: 8px 10px;
    color: var(--text-faint);
    font-size: 14px;
    border-radius: var(--radius-sm);
    border: 1px dashed var(--border-strong);
    transition: color var(--fast) var(--ease), border-color var(--fast) var(--ease);
  }
  .empty-hint:hover {
    color: var(--accent);
    border-color: var(--accent);
  }

  .card-foot {
    padding: 4px 8px 8px;
  }
  .add-row {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--text-faint);
    font-size: 13.5px;
    font-weight: 500;
    padding: 5px 7px;
    border-radius: var(--radius-sm);
    width: 100%;
    transition: background var(--fast) var(--ease), color var(--fast) var(--ease);
  }
  .add-row:hover {
    background: var(--surface-hover);
    color: var(--accent);
  }

  .swatches {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    width: 132px;
  }
  .swatch {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
    transition: transform var(--fast) var(--ease);
  }
  .swatch:hover {
    transform: scale(1.15);
  }
  .swatch.active {
    box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--accent);
  }

  /* dnd drop target hint */
  .list :global(.item-wrap) {
    border-radius: var(--radius-sm);
  }
</style>
