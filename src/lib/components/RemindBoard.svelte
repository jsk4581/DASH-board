<script>
  // The Reminders tab: the notification settings, then every board's items
  // with a tick per item. Ticked items make up the reminder notification.
  import Icon from './Icon.svelte'
  import RemindSettings from './RemindSettings.svelte'
  import { library, toggleRemind } from '../store.svelte.js'
  import { formatShort } from '../date.js'
  import { t } from '../i18n.svelte.js'

  let { editing = true } = $props()

  const groups = $derived(
    library.boards
      .map((b) => ({ board: b, projects: b.projects.filter((p) => p.items.length > 0) }))
      .filter((g) => g.projects.length > 0)
  )
  const picked = (p) => p.items.filter((it) => it.remind).length
</script>

<section class="remind-board">
  <div class="settings">
    <RemindSettings />
  </div>
  <p class="lead">{t('remindPick')}</p>
  {#if groups.length === 0}
    <p class="empty">{t('remindPickEmpty')}</p>
  {:else}
    <div class="grid">
      {#each groups as g (g.board.id)}
        {#each g.projects as project (project.id)}
          <article class="card" style="--card-accent: {project.color};">
            <header class="card-head">
              <span class="color-dot"></span>
              <h2 class="title">{project.title}</h2>
              {#if library.boards.length > 1}<span class="bname">{g.board.name}</span>{/if}
              {#if picked(project)}<span class="count">{t('remindPicked', { n: picked(project) })}</span>{/if}
            </header>
            <ul class="list">
              {#each project.items as it (it.id)}
                <li>
                  <button
                    class="row"
                    class:on={it.remind}
                    class:done={it.status === 'done'}
                    disabled={!editing}
                    onclick={() => toggleRemind(project.id, it.id)}
                    aria-pressed={it.remind}
                  >
                    <span class="tick">{#if it.remind}<Icon name="bell" size={12} strokeWidth={2.5} />{/if}</span>
                    <span class="text">{it.text}</span>
                    {#if it.due}<span class="due">{formatShort(it.due)}</span>{/if}
                  </button>
                </li>
              {/each}
            </ul>
          </article>
        {/each}
      {/each}
    </div>
  {/if}
</section>

<style>
  .remind-board {
    padding: 18px clamp(14px, 3vw, 32px) 24px;
  }
  .settings {
    max-width: 520px;
    margin-bottom: 18px;
  }
  .lead {
    margin: 0 0 10px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
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
    border-left: 3px solid var(--card-accent);
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
  .bname,
  .count {
    flex: none;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-faint);
    white-space: nowrap;
  }
  .bname {
    max-width: 35%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .count {
    color: var(--accent-ink);
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
    width: 100%;
    padding: 6px 6px;
    min-height: 34px;
    border-radius: var(--radius-xs);
    text-align: left;
    color: var(--text);
    -webkit-tap-highlight-color: transparent;
  }
  .row:hover:not(:disabled) {
    background: var(--surface-hover);
  }
  .row.on {
    background: var(--accent-soft);
  }
  .row:disabled {
    cursor: default;
  }
  .tick {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1.5px solid var(--border-strong);
    color: var(--surface);
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
