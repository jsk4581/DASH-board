<script>
  // The Dump: one charcoal card of loose items outside every board, for
  // jotting things down before they have a place. Items are ordinary items
  // (state, dates, drag order) and move onto a board's project from here,
  // one at a time from the item's pill, or several at once in select mode.
  import { dragHandleZone } from 'svelte-dnd-action'
  import { flip } from 'svelte/animate'
  import Icon from './Icon.svelte'
  import TodoItem from './TodoItem.svelte'
  import MoveSheet from './MoveSheet.svelte'
  import { library, addItem, setItems, moveDumpItems, addProject, findProject, DUMP_ID } from '../store.svelte.js'
  import { formatShort } from '../date.js'
  import { onBackButton } from '../platform.js'
  import { t } from '../i18n.svelte.js'

  let { editing = true } = $props()

  const FLIP = 180
  const items = $derived(library.dump.items)

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

<section class="dump">
  <p class="lead">{t('dumpLead')}</p>

  <article class="card" class:selecting>
    <header class="card-head">
      <span class="mark"><Icon name="inbox" size={16} /></span>
      {#if selecting}
        <h2 class="title">{t('dumpSelected', { n: pickedCount })}</h2>
        <button class="head-btn" onclick={toggleAll}>{allPicked ? t('dumpSelectNone') : t('dumpSelectAll')}</button>
        <button class="icon-btn" onclick={stopSelecting} title={t('close')} aria-label={t('close')}>
          <Icon name="x" size={15} />
        </button>
      {:else}
        <h2 class="title">{t('dumpTab')}</h2>
        <span class="count">{items.length}</span>
        {#if editing}
          <button class="head-btn" onclick={startSelecting} disabled={items.length === 0}>
            <Icon name="check" size={13} strokeWidth={2.5} /> {t('dumpSelect')}
          </button>
          <button class="icon-btn" title={t('addItem')} aria-label={t('addItem')} onclick={add}>
            <Icon name="plus" size={16} />
          </button>
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
          dragDisabled: !editing,
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
        {#if items.length === 0}
          {#if editing}
            <button class="empty-hint" onclick={add}>{t('dumpEmpty')}</button>
          {:else}
            <p class="empty-note">{t('dumpEmpty')}</p>
          {/if}
        {/if}
      </div>
      {#if editing && items.length > 0}
        <footer class="card-foot">
          <button class="add-row" onclick={add}>
            <Icon name="plus" size={15} /> {t('addItem')}
          </button>
        </footer>
      {/if}
    {/if}
  </article>
</section>

{#if moveIds}
  <MoveSheet count={moveIds.length} onpick={onPick} onclose={() => (moveIds = null)} />
{/if}

{#if toast}
  <div class="toast">{toast}</div>
{/if}

<style>
  .dump {
    padding: 18px clamp(14px, 3vw, 32px) 24px;
    max-width: 760px;
    margin: 0 auto;
  }
  .lead {
    margin: 0 0 12px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
  }

  /* the charcoal card: the dark token set, whatever the page theme, so the
     shared item component re-skins itself without knowing where it is */
  .card {
    --surface: oklch(0.3 0.008 286);
    --surface-2: oklch(0.335 0.008 286);
    --surface-hover: oklch(0.37 0.008 286);
    --border: oklch(1 0 0 / 11%);
    --border-strong: oklch(1 0 0 / 20%);
    --text: oklch(0.985 0 0);
    --text-muted: oklch(0.74 0.012 286);
    --text-faint: oklch(0.58 0.014 286);
    --accent: oklch(0.7 0.11 255);
    --accent-hover: oklch(0.76 0.12 255);
    --accent-soft: oklch(0.36 0.06 255);
    --accent-ink: oklch(0.95 0.03 255);
    --done: oklch(0.56 0.014 286);
    --pencil: oklch(0.72 0.19 22);
    --shadow-md: 0 4px 14px rgba(0, 0, 0, 0.4);
    background: var(--surface);
    color: var(--text);
    border: 1px solid oklch(1 0 0 / 8%);
    border-radius: var(--radius);
    box-shadow: 0 6px 22px rgba(24, 24, 27, 0.16);
    display: flex;
    flex-direction: column;
    overflow: clip;
  }
  :global(:root[data-theme='dark']) .card {
    --surface: oklch(0.14 0.006 286);
    --surface-2: oklch(0.18 0.006 286);
    --surface-hover: oklch(0.22 0.006 286);
    border-color: oklch(1 0 0 / 12%);
    box-shadow: 0 6px 22px rgba(0, 0, 0, 0.45);
  }
  .card :global(.icon-btn.danger:hover) {
    background: #3a1a1a;
    color: #ff6b6b;
  }
  .card :global(.due-stamp.overdue) {
    background: #3a1c1c;
    color: #ff8080;
  }

  .card-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 11px 10px 9px 14px;
    border-bottom: 1px solid var(--border);
    min-height: 48px;
  }
  .mark {
    display: flex;
    color: var(--text-muted);
    flex: none;
  }
  .title {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: 15px;
    font-weight: 700;
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
  .head-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex: none;
    padding: 5px 10px;
    border-radius: 99px;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-muted);
    border: 1px solid var(--border-strong);
    transition: background var(--fast) var(--ease), color var(--fast) var(--ease);
  }
  .head-btn:hover:not(:disabled) {
    background: var(--surface-hover);
    color: var(--text);
  }
  .head-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .list {
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .list.empty {
    min-height: 56px;
  }
  .item-wrap {
    outline: none;
    border-radius: var(--radius-sm);
  }
  .empty-hint,
  .empty-note {
    width: 100%;
    margin: 0;
    text-align: left;
    padding: 10px 12px;
    color: var(--text-faint);
    font-size: 14px;
    border-radius: var(--radius-sm);
  }
  .empty-hint {
    border: 1px dashed var(--border-strong);
    transition: color var(--fast) var(--ease), border-color var(--fast) var(--ease);
  }
  .empty-hint:hover {
    color: var(--accent-ink);
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
    color: var(--accent-ink);
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
    padding: 8px 10px 10px;
    border-top: 1px solid var(--border);
    background: var(--surface);
  }
  .ghost,
  .primary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: var(--radius-sm);
    font-size: 13.5px;
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
    color: oklch(0.15 0.02 255);
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
</style>
