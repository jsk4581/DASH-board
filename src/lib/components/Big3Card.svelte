<script>
  // Big 3: up to three items pinned above the board, picked from any board
  // (or the Dump). The items stay where they live; this card shows the live
  // ones, so ticking or editing here edits them in place.
  import Icon from './Icon.svelte'
  import TodoItem from './TodoItem.svelte'
  import Big3Picker from './Big3Picker.svelte'
  import { library, big3Items, toggleBig3, BIG3_MAX } from '../store.svelte.js'
  import { t } from '../i18n.svelte.js'

  let { editing = true } = $props()

  const picked = $derived(big3Items())
  let showPicker = $state(false)
  const many = $derived(library.boards.length > 1)
</script>

{#if editing || picked.length > 0}
  <article class="big3" class:empty={picked.length === 0}>
    <header class="head">
      <span class="mark"><Icon name="flag" size={15} strokeWidth={2.4} /></span>
      <h2 class="title">{t('big3')}</h2>
      <span class="hint">{t('big3Hint')}</span>
      <span class="count">{t('big3Count', { n: picked.length })}</span>
      {#if editing && picked.length < BIG3_MAX}
        <div class="head-actions">
          <button class="icon-btn" title={t('big3Pick')} aria-label={t('big3Pick')} onclick={() => (showPicker = true)}>
            <Icon name="plus" size={16} />
          </button>
        </div>
      {/if}
    </header>

    {#if picked.length === 0}
      <div class="list">
        <button class="empty-hint" onclick={() => (showPicker = true)}>{t('big3Empty')}</button>
      </div>
    {:else}
      <ol class="slots">
        {#each picked as e, i (e.item.id)}
          <li class="slot">
            <span class="rank">{i + 1}</span>
            <div class="row">
              <TodoItem pid={e.pid} item={e.item} {editing} />
            </div>
            <span class="from" title={e.project ? (many && e.board ? `${e.board.name} · ${e.project.title}` : e.project.title) : t('dumpTab')}>
              {e.project ? (many && e.board ? `${e.board.name} · ${e.project.title}` : e.project.title) : t('dumpTab')}
            </span>
            {#if editing}
              <button class="icon-btn unpin" onclick={() => toggleBig3(e.pid, e.item.id)} title={t('big3Unpin')} aria-label={t('big3Unpin')}>
                <Icon name="x" size={13} />
              </button>
            {/if}
          </li>
        {/each}
      </ol>
      {#if editing && picked.length < BIG3_MAX}
        <footer class="card-foot">
          <button class="add-row" onclick={() => (showPicker = true)}>
            <Icon name="plus" size={15} /> {t('big3Pick')}
          </button>
        </footer>
      {/if}
    {/if}
  </article>
{/if}

{#if showPicker}
  <Big3Picker onclose={() => (showPicker = false)} />
{/if}

<style>
  .big3 {
    --card-accent: var(--highlight);
    margin-bottom: 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
    position: relative;
    overflow: clip;
  }
  .big3::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--card-accent);
  }
  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 10px 8px 14px;
    border-bottom: 1px solid var(--border);
    min-height: 44px;
  }
  .mark {
    display: flex;
    flex: none;
    color: var(--card-accent);
  }
  .title {
    margin: 0;
    font-size: 15px;
    font-weight: 750;
    color: var(--text);
    letter-spacing: 0.01em;
    flex: none;
  }
  .hint {
    flex: 1;
    min-width: 0;
    font-size: 12.5px;
    color: var(--text-faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .count {
    flex: none;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }
  /* the same hover-revealed head actions as a project card */
  .head-actions {
    display: flex;
    gap: 1px;
    flex: none;
    opacity: 0;
    transform: translateX(4px);
    transition: opacity var(--fast) var(--ease), transform var(--fast) var(--ease);
  }
  .big3:hover .head-actions,
  .big3:focus-within .head-actions {
    opacity: 1;
    transform: none;
  }
  @media (hover: none) {
    .head-actions {
      opacity: 1;
      transform: none;
    }
  }

  .slots {
    list-style: none;
    margin: 0;
    padding: 6px 8px 8px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px 10px;
  }
  .slot {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas: 'rank row unpin' 'rank from unpin';
    align-items: start;
    column-gap: 6px;
    padding: 4px 2px 4px 6px;
    border-radius: var(--radius-sm);
    min-height: 44px;
  }
  .rank {
    grid-area: rank;
    width: 20px;
    height: 20px;
    margin-top: 4px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 11.5px;
    font-weight: 750;
    color: var(--text);
    background: var(--highlight-soft);
    font-variant-numeric: tabular-nums;
    flex: none;
  }
  .row {
    grid-area: row;
    min-width: 0;
  }
  .from {
    grid-area: from;
    min-width: 0;
    padding-left: 30px;
    font-size: 11.5px;
    color: var(--text-faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .unpin {
    grid-area: unpin;
    width: 22px;
    height: 22px;
    margin-top: 3px;
    opacity: 0;
    transition: opacity var(--fast) var(--ease);
  }
  .slot:hover .unpin,
  .slot:focus-within .unpin {
    opacity: 1;
  }
  @media (hover: none) {
    .unpin {
      opacity: 1;
    }
  }
  /* the empty state and the footer row mirror a project card's */
  .list {
    padding: 6px;
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
    padding: 0 8px 8px;
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

  @media (max-width: 760px) {
    .slots {
      grid-template-columns: 1fr;
      gap: 2px;
    }
    .hint {
      display: none;
    }
  }
</style>
