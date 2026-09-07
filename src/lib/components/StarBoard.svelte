<script>
  // The Highlights view: every item circled in red, from every board, grouped
  // by board and project. Items are the live ones (editing here edits the
  // board they live on); the timeline below shows their dates.
  import Icon from './Icon.svelte'
  import TodoItem from './TodoItem.svelte'
  import Timeline from './Timeline.svelte'
  import { library } from '../store.svelte.js'
  import { t } from '../i18n.svelte.js'

  let { editing = true } = $props()

  const groups = $derived(
    library.boards
      .map((b) => ({
        board: b,
        projects: b.projects
          .map((p) => ({ ...p, items: p.items.filter((it) => it.status === 'highlight') }))
          .filter((p) => p.items.length > 0),
      }))
      .filter((g) => g.projects.length > 0)
  )
  // for the timeline: one pseudo-project per (board, project), titled by both
  const projects = $derived(
    groups.flatMap((g) =>
      g.projects.map((p) => ({ ...p, title: library.boards.length > 1 ? `${g.board.name} · ${p.title}` : p.title }))
    )
  )
</script>

<section class="star-board">
  {#if groups.length === 0}
    <p class="empty">{t('starEmpty')}</p>
  {:else}
    <div class="grid">
      {#each groups as g (g.board.id)}
        {#each g.projects as project (project.id)}
          <article class="card" style="--card-accent: {project.color};">
            <header class="card-head">
              <span class="color-dot"></span>
              <h2 class="title">{project.title}</h2>
              {#if library.boards.length > 1}<span class="bname">{g.board.name}</span>{/if}
            </header>
            <ul class="list">
              {#each project.items as item (item.id)}
                <li>
                  <TodoItem pid={project.id} {item} {editing} />
                </li>
              {/each}
            </ul>
          </article>
        {/each}
      {/each}
    </div>
  {/if}
</section>
{#if projects.length > 0}
  <Timeline {editing} {projects} />
{/if}

<style>
  .star-board {
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
  .bname {
    flex: none;
    max-width: 40%;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 6px 8px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
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
