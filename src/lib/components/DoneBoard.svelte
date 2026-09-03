<script>
  import Icon from './Icon.svelte'
  import { board, restoreItem, purgeItem } from '../store.svelte.js'
  import { formatShort } from '../date.js'
  import { t } from '../i18n.svelte.js'

  // The Completed tab: the same card grid as the board, minus the timeline,
  // showing each project's archive (items deleted while done).
  let { editing = true } = $props()

  const groups = $derived(board.projects.filter((p) => p.archive.length > 0))
</script>

<section class="done-board">
  {#if groups.length === 0}
    <p class="empty">{t('doneEmpty')}</p>
  {:else}
    <div class="grid">
      {#each groups as project (project.id)}
        <article class="card" style="--card-accent: {project.color};">
          <header class="card-head">
            <span class="color-dot"></span>
            <h2 class="title">{project.title}</h2>
            <span class="count">{project.archive.length}</span>
          </header>
          <ul class="list">
            {#each project.archive as it (it.id)}
              <li class="row" class:highlight={it.status === 'highlight'}>
                <span class="tick"><Icon name="check" size={12} strokeWidth={3} /></span>
                <span class="text">{it.text}</span>
                {#if it.archivedAt}<span class="when">{formatShort(it.archivedAt)}</span>{/if}
                {#if editing}
                  <span class="acts">
                    <button
                      class="icon-btn"
                      title={t('restoreItem')}
                      aria-label={t('restoreItem')}
                      onclick={() => restoreItem(project.id, it.id)}
                    >
                      <Icon name="undo" size={13} />
                    </button>
                    <button
                      class="icon-btn danger"
                      title={t('deleteForever')}
                      aria-label={t('deleteForever')}
                      onclick={() => purgeItem(project.id, it.id)}
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </span>
                {/if}
              </li>
            {/each}
          </ul>
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .done-board {
    padding: 18px clamp(14px, 3vw, 32px) 8px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 14px;
    align-items: start;
  }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }
  .card-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px 10px;
    border-bottom: 1px solid var(--border);
  }
  .color-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--card-accent);
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
  }
  .list {
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
    gap: 8px;
    padding: 6px 6px;
    border-radius: var(--radius-xs);
    min-height: 34px;
  }
  .row:hover {
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
  .text {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    color: var(--done);
    text-decoration: line-through;
    overflow-wrap: anywhere;
  }
  .row.highlight .text {
    font-weight: 700;
  }
  .when {
    font-size: 11.5px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
    flex: none;
  }
  .acts {
    display: flex;
    gap: 1px;
    flex: none;
    opacity: 0;
    transition: opacity var(--fast) var(--ease);
  }
  .row:hover .acts,
  .row:focus-within .acts {
    opacity: 1;
  }
  @media (hover: none) {
    .acts {
      opacity: 1;
    }
  }
  .icon-btn.danger:hover {
    color: #d92d2d;
  }
  .empty {
    text-align: center;
    color: var(--text-faint);
    padding: 48px 0;
  }
  @media (max-width: 560px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
