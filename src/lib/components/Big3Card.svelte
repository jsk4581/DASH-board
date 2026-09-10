<script>
  // Daily Big 3: a project card pinned above the board, holding up to three
  // items picked from any board (or the Dump). Same chrome as a project
  // card; "add" opens the picker instead of a blank row, and the item's
  // trash unpins instead of deleting. Items stay where they live.
  import Icon from './Icon.svelte'
  import TodoItem from './TodoItem.svelte'
  import Big3Picker from './Big3Picker.svelte'
  import { big3Items, toggleBig3, BIG3_MAX } from '../store.svelte.js'
  import { t } from '../i18n.svelte.js'

  let { editing = true } = $props()

  const picked = $derived(big3Items())
  const done = $derived(picked.filter((e) => e.item.status === 'done').length)
  const room = $derived(picked.length < BIG3_MAX)
  let showPicker = $state(false)
</script>

{#if editing || picked.length > 0}
  <div class="pinned">
    <article class="card" style="--card-accent: var(--highlight);">
      <header class="card-head">
        <span class="mark"><Icon name="flag" size={14} strokeWidth={2.4} /></span>
        <h2 class="title">{t('big3')}</h2>
        <span class="count" title={t('doneTotal')}>{done}/{picked.length}</span>
        {#if editing && room}
          <div class="head-actions">
            <button class="icon-btn" title={t('addItem')} aria-label={t('addItem')} onclick={() => (showPicker = true)}>
              <Icon name="plus" size={16} />
            </button>
          </div>
        {/if}
      </header>

      <div class="list" class:empty={picked.length === 0}>
        {#each picked as e (e.item.id)}
          <div class="item-wrap">
            <TodoItem pid={e.pid} item={e.item} {editing} onremove={editing ? () => toggleBig3(e.pid, e.item.id) : undefined} removeLabel={t('big3Unpin')} />
          </div>
        {/each}
        {#if picked.length === 0 && editing}
          <button class="empty-hint" onclick={() => (showPicker = true)}>{t('addFirstItem')}</button>
        {/if}
      </div>

      {#if editing && picked.length > 0 && room}
        <footer class="card-foot">
          <button class="add-row" onclick={() => (showPicker = true)}>
            <Icon name="plus" size={15} /> {t('addItem')}
          </button>
        </footer>
      {/if}
    </article>
  </div>
{/if}

{#if showPicker}
  <Big3Picker onclose={() => (showPicker = false)} />
{/if}

<style>
  /* the same column template as the board grid, so the card is card-sized */
  .pinned {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 14px;
    margin-bottom: 14px;
  }
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
  .card:focus-within .head-actions {
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

  @media (max-width: 560px) {
    .pinned {
      grid-template-columns: 1fr;
    }
  }
</style>
