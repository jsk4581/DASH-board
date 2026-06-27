<script>
  import { dragHandleZone } from 'svelte-dnd-action'
  import { flip } from 'svelte/animate'
  import ProjectCard from './ProjectCard.svelte'
  import Icon from './Icon.svelte'
  import { board, addProject, setProjects } from '../store.svelte.js'
  import { t } from '../i18n.svelte.js'

  let { editing = true } = $props()

  const FLIP = 200

  function handleConsider(e) {
    setProjects(e.detail.items)
  }
  function handleFinalize(e) {
    setProjects(e.detail.items)
  }
</script>

<section class="board">
  <div
    class="grid"
    use:dragHandleZone={{
      items: board.projects,
      type: 'projects',
      dragDisabled: !editing,
      flipDurationMs: FLIP,
      dropTargetStyle: {},
    }}
    onconsider={handleConsider}
    onfinalize={handleFinalize}
  >
    {#each board.projects as project (project.id)}
      <div class="cell" animate:flip={{ duration: FLIP }}>
        <ProjectCard {project} {editing} />
      </div>
    {/each}
  </div>

  {#if board.projects.length === 0 && !editing}
    <p class="empty-board">{t('boardEmpty')}</p>
  {/if}

  {#if editing}
    <button class="add-project" onclick={() => addProject(t('newProject'))}>
      <Icon name="plus" size={17} />
      {t('newProject')}
    </button>
  {/if}
</section>

<style>
  .board {
    padding: 18px clamp(14px, 3vw, 32px) 8px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 14px;
    align-items: start;
  }
  .cell {
    min-width: 0;
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

  @media (max-width: 560px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
