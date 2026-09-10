<script>
  // The Dump: a project card outside every board, charcoal as its colour,
  // for jotting things down before they have a place. Items are ordinary
  // items (state, dates, drag order) and move onto a board's project from
  // here: one from the arrow on the item's pill, several from select mode.
  import { dragHandleZone } from 'svelte-dnd-action'
  import { flip } from 'svelte/animate'
  import Icon from './Icon.svelte'
  import TodoItem from './TodoItem.svelte'
  import MoveSheet from './MoveSheet.svelte'
  import { library, addItem, setItems, moveDumpItems, addProject, findProject, DUMP_ID } from '../store.svelte.js'
  import { formatShort } from '../date.js'
  import { onBackButton } from '../platform.js'
  import { t } from '../i18n.svelte.js'

  // focus: only the starred items, no adding or reordering
  let { editing = true, focus = false } = $props()

  const FLIP = 180
  const all = $derived(library.dump.items)
  const items = $derived(focus ? all.filter((it) => it.status === 'highlight') : all)
  const canAdd = $derived(editing && !focus)
  const done = $derived(all.filter((it) => it.status === 'done').length)

  let autofocusId = $state(null)
  let selecting = $state(false)
  let picked = $state(new Set())
  let moveIds = $state(null) // ids handed to the sheet, or null
  let toast = $state('')

  const pickedCount = $derived(items.filter((it) => picked.has(it.id)).length)
  const allPicked = $derived(items.length > 0 && pickedCount === items.length)

  // leaving edit mode drops the selection with it
  $effect(() => {
    if (!editing) stopSelecting()
  })
  // hardware back (apps): a selection or the sheet closes before the view does
  $effect(() =>
    onBackButton(() => {
      if (moveIds) {
        moveIds = null
        return true
      }
      if (selecting) {
        stopSelecting()
        return true
      }
      return false
    })
  )

  function handleConsider(e) {
    setItems(DUMP_ID, e.detail.items)
  }
  function handleFinalize(e) {
    setItems(DUMP_ID, e.detail.items)
  }

  function add() {
    const it = addItem(DUMP_ID)
    autofocusId = it.id
  }

  function startSelecting() {
    selecting = true
    picked = new Set()
  }
  function stopSelecting() {
    selecting = false
    picked = new Set()
  }
  function toggle(id) {
    const next = new Set(picked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    picked = next
  }
  function toggleAll() {
    picked = allPicked ? new Set() : new Set(items.map((it) => it.id))
  }

  function moveOne(id) {
    moveIds = [id]
  }
  function movePicked() {
    if (pickedCount) moveIds = items.filter((it) => picked.has(it.id)).map((it) => it.id)
  }

  // the sheet's pick: a project id, or { boardId } for a new project there
  function onPick(target) {
    const ids = moveIds ?? []
    moveIds = null
    let pid = target.projectId
    if (!pid) pid = addProject(t('newProject'), target.boardId).id
    const n = moveDumpItems(ids, pid)
    const p = findProject(pid)
    const b = library.boards.find((x) => x.projects.some((q) => q.id === pid))
    const name = library.boards.length > 1 && b ? `${b.name} · ${p?.title ?? ''}` : p?.title ?? ''
    flash(t('dumpMoved', { n, name }))
    stopSelecting()
  }

  function flash(msg) {
    toast = msg
    setTimeout(() => (toast = ''), 2400)
  }

  function onKey(e) {
    if (e.key === 'Escape' && selecting && !moveIds) stopSelecting()
  }
</script>

<svelte:window onkeydown={onKey} />

<section class="board">
  <div class="grid">
    <article class="card">
      <header class="card-head">
        <span class="mark"><Icon name="inbox" size={14} strokeWidth={2.2} /></span>
        {#if selecting}
          <h2 class="title">{t('dumpSelected', { n: pickedCount })}</h2>
          <div class="head-actions on">
            <button class="icon-btn" onclick={toggleAll} title={allPicked ? t('dumpSelectNone') : t('dumpSelectAll')} aria-label={allPicked ? t('dumpSelectNone') : t('dumpSelectAll')}>
              <Icon name="check" size={15} strokeWidth={2.5} />
            </button>
            <button class="icon-btn" onclick={stopSelecting} title={t('close')} aria-label={t('close')}>
              <Icon name="x" size={15} />
            </button>
          </div>
        {:else}
          <h2 class="title">{t('dumpTab')}</h2>
          <span class="count" title={t('doneTotal')}>{done}/{all.length}</span>
          {#if editing}
            <div class="head-actions">
              {#if canAdd}
                <button class="icon-btn" title={t('addItem')} aria-label={t('addItem')} onclick={add}>
                  <Icon name="plus" size={16} />
                </button>
              {/if}
              {#if items.length > 0}
                <button class="icon-btn" title={t('dumpMove')} aria-label={t('dumpMove')} onclick={startSelecting}>
                  <Icon name="moveTo" size={15} />
                </button>
              {/if}
            </div>
          {/if}
        {/if}
      </header>

      {#if selecting}
        <ul class="picklist">
          {#each items as it (it.id)}
            <li>
              <button class="row" class:on={picked.has(it.id)} class:done={it.status === 'done'} onclick={() => toggle(it.id)} aria-pressed={picked.has(it.id)}>
                <span class="tick">{#if picked.has(it.id)}<Icon name="check" size={12} strokeWidth={3} />{/if}</span>
                <span class="text">{it.text}</span>
                {#if it.due}<span class="due">{formatShort(it.due)}</span>{/if}
              </button>
            </li>
          {/each}
        </ul>
        <footer class="bar">
          <button class="ghost" onclick={stopSelecting}>{t('close')}</button>
          <button class="primary" onclick={movePicked} disabled={pickedCount === 0}>
            <Icon name="moveTo" size={14} /> {t('dumpMove')}
          </button>
        </footer>
      {:else}
        <div
          class="list"
          class:empty={items.length === 0}
          use:dragHandleZone={{
            items,
            type: 'dump-items',
            dragDisabled: !canAdd,
            flipDurationMs: FLIP,
            dropTargetStyle: {},
          }}
          onconsider={handleConsider}
          onfinalize={handleFinalize}
        >
          {#each items as item (item.id)}
            <div class="item-wrap" animate:flip={{ duration: FLIP }}>
              <TodoItem pid={DUMP_ID} {item} {editing} autofocus={item.id === autofocusId} onenter={add} onmove={editing ? moveOne : undefined} />
            </div>
          {/each}
          {#if items.length === 0 && canAdd}
            <button class="empty-hint" onclick={add}>{t('addFirstItem')}</button>
          {/if}
        </div>
        {#if canAdd && items.length > 0}
          <footer class="card-foot">
            <button class="add-row" onclick={add}>
              <Icon name="plus" size={15} /> {t('addItem')}
            </button>
          </footer>
        {/if}
      {/if}
    </article>
  </div>
  {#if focus && items.length === 0}
    <p class="empty-board">{t('focusEmpty')}</p>
  {:else if items.length === 0 && !editing}
    <p class="empty-board">{t('dumpEmpty')}</p>
  {/if}
</section>

{#if moveIds}
  <MoveSheet count={moveIds.length} onpick={onPick} onclose={() => (moveIds = null)} />
{/if}

{#if toast}
  <div class="toast">{toast}</div>
{/if}

<style>
  /* the board's own padding and column template, so the card sits where
     the first project card would */
  .board {
    padding: 18px clamp(14px, 3vw, 32px) 8px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 14px;
    align-items: start;
  }
  .card {
    --card-accent: oklch(0.36 0.008 286);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: box-shadow var(--med) var(--ease), border-color var(--med) var(--ease);
  }
  :global(:root[data-theme='dark']) .card {
    --card-accent: oklch(0.62 0.01 286);
  }
  .card:hover {
    box-shadow: var(--shadow-md);
  }
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
  .mark {
    display: flex;
    flex: none;
    color: var(--card-accent);
  }
  .title {
    flex: 1;
    min-width: 0;
    font-size: 15px;
    font-weight: 650;
    margin: 0;
    padding: 2px 4px;
    margin-left: -4px;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .count {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
    flex: none;
  }
  .head-actions {
    display: flex;
    gap: 1px;
    flex: none;
    opacity: 0;
    transform: translateX(4px);
    transition: opacity var(--fast) var(--ease), transform var(--fast) var(--ease);
  }
  .card:hover .head-actions,
  .card:focus-within .head-actions,
  .head-actions.on {
    opacity: 1;
    transform: none;
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
    border-radius: var(--radius-sm);
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
  .empty-board {
    text-align: center;
    color: var(--text-faint);
    padding: 40px 0;
  }

  /* select mode: rows with a tick, and a bar that stays in reach */
  .picklist {
    list-style: none;
    margin: 0;
    padding: 6px 8px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    padding: 6px 6px;
    min-height: 36px;
    border-radius: var(--radius-xs);
    text-align: left;
    color: var(--text);
    -webkit-tap-highlight-color: transparent;
  }
  .row:hover {
    background: var(--surface-hover);
  }
  .row.on {
    background: var(--accent-soft);
  }
  .tick {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 5px;
    border: 1.5px solid var(--border-strong);
    color: var(--accent-ink);
    flex: none;
    transition: background var(--fast) var(--ease), border-color var(--fast) var(--ease);
  }
  .row.on .tick {
    background: var(--accent);
    border-color: var(--accent);
  }
  .text {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
  .row.done .text {
    color: var(--done);
    text-decoration: line-through;
  }
  .row.on .text {
    font-weight: 600;
    color: var(--accent-ink);
  }
  .due {
    flex: none;
    font-size: 11.5px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }
  .bar {
    position: sticky;
    bottom: calc(8px + var(--safe-bottom));
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 8px 8px 8px;
    border-top: 1px solid var(--border);
    background: var(--surface);
  }
  .ghost,
  .primary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 600;
  }
  .ghost {
    color: var(--text-muted);
  }
  .ghost:hover {
    background: var(--surface-hover);
  }
  .primary {
    background: var(--accent);
    color: var(--accent-ink);
  }
  .primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }
  .primary:disabled {
    opacity: 0.4;
    cursor: default;
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
  }
</style>
