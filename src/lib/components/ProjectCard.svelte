<script>
  import { dragHandleZone, dragHandle } from 'svelte-dnd-action'
  import { flip } from 'svelte/animate'
  import Icon from './Icon.svelte'
  import TodoItem from './TodoItem.svelte'
  import Popover from './Popover.svelte'
  import {
    addItem,
    removeProject,
    renameProject,
    setProjectColor,
    setItems,
    PALETTE,
  } from '../store.svelte.js'
  import { t } from '../i18n.svelte.js'

  let { project, editing = true } = $props()

  const FLIP = 180
  let autofocusId = $state(null)
  let colorBtn = $state(null)
  let showColor = $state(false)

  const done = $derived(project.items.filter((i) => i.status === 'done').length)

  function handleConsider(e) {
    setItems(project.id, e.detail.items)
  }
  function handleFinalize(e) {
    setItems(project.id, e.detail.items)
  }

  function add() {
    const it = addItem(project.id)
    autofocusId = it.id
  }
</script>

<article class="card" style="--card-accent: {project.color};">
  <header class="card-head">
    {#if editing}
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
        <button class="icon-btn" title={t('addItem')} aria-label={t('addItem')} onclick={add}>
          <Icon name="plus" size={16} />
        </button>
        <button
          class="icon-btn danger"
          title={t('deleteProject')}
          aria-label={t('deleteProject')}
          onclick={() => removeProject(project.id)}
        >
          <Icon name="trash" size={15} />
        </button>
      </div>
    {/if}
  </header>

  <div
    class="list"
    class:empty={project.items.length === 0}
    use:dragHandleZone={{
      items: project.items,
      type: 'items',
      dragDisabled: !editing,
      flipDurationMs: FLIP,
      dropTargetStyle: {},
    }}
    onconsider={handleConsider}
    onfinalize={handleFinalize}
  >
    {#each project.items as item (item.id)}
      <div class="item-wrap" animate:flip={{ duration: FLIP }}>
        <TodoItem
          pid={project.id}
          {item}
          {editing}
          autofocus={item.id === autofocusId}
          onenter={add}
        />
      </div>
    {/each}

    {#if project.items.length === 0 && editing}
      <button class="empty-hint" onclick={add}>{t('addFirstItem')}</button>
    {/if}
  </div>

  {#if editing && project.items.length > 0}
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
