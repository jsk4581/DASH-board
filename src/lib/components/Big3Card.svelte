<script>
  // A Big 3 card pinned above the board, with the project card's chrome.
  // Daily: up to three items pinned from any board (or the Dump, or the
  // other two cards); "add" opens the picker, the item's trash unpins, and
  // the items stay where they live. Monthly and Yearly: a list of their own,
  // up to three items written right here, like a small project. The board
  // lays the three cards out.
  import Icon from './Icon.svelte'
  import TodoItem from './TodoItem.svelte'
  import Big3Picker from './Big3Picker.svelte'
  import { library, big3Items, toggleBig3, addItem, BIG3_MAX } from '../store.svelte.js'
  import { t } from '../i18n.svelte.js'

  let { editing = true, scope = 'day' } = $props()

  const NAME = { day: 'big3', month: 'big3Month', year: 'big3Year' }
  const name = $derived(t(NAME[scope]))
  const own = $derived(scope === 'day' ? null : library.big3[scope]) // the card's own list
  const picked = $derived(own ? own.items.map((item) => ({ pid: own.id, item })) : big3Items())
  const done = $derived(picked.filter((e) => e.item.status === 'done').length)
  const room = $derived(picked.length < BIG3_MAX)
  let showPicker = $state(false)
  let autofocusId = $state(null)

  // "add": the picker for Daily, a blank row of its own for the others
  function add() {
    if (!own) showPicker = true
    else if (room) autofocusId = addItem(own.id).id
  }
</script>

{#if editing || picked.length > 0}
  <article class="card" style="--card-accent: var(--highlight);">
    <header class="card-head">
      <span class="mark"><Icon name="flag" size={14} strokeWidth={2.4} /></span>
      <h2 class="title">{name}</h2>
      <span class="count" title={t('doneTotal')}>{done}/{picked.length}</span>
    </header>

    <div class="list" class:empty={picked.length === 0}>
      {#each picked as e (e.item.id)}
        <div class="item-wrap">
          {#if own}
            <TodoItem pid={e.pid} item={e.item} {editing} underline autofocus={e.item.id === autofocusId} onenter={add} />
          {:else}
            <TodoItem pid={e.pid} item={e.item} {editing} underline onremove={editing ? () => toggleBig3(e.pid, e.item.id) : undefined} removeLabel={t('big3Unpin')} />
          {/if}
        </div>
      {/each}
      {#if picked.length === 0 && editing}
        <button class="empty-hint" onclick={add}>{t('addFirstItem')}</button>
      {/if}
    </div>

    {#if editing && picked.length > 0 && room}
      <footer class="card-foot">
        <button class="add-row" onclick={add}>
          <Icon name="plus" size={15} /> {t('addItem')}
        </button>
      </footer>
    {/if}
  </article>
{/if}

{#if showPicker}
  <Big3Picker onclose={() => (showPicker = false)} />
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
  /* the count surfaces on hover, as on a project card */
  .count {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
    flex: none;
    opacity: 0;
    transition: opacity var(--fast) var(--ease);
  }
  .card:hover .count,
  .card:focus-within .count {
    opacity: 1;
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
</style>
