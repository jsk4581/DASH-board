<script>
  // Where Dump items go: a project on one of the boards, or a new project on
  // a board. onpick({ projectId }) or onpick({ boardId }) for a new one.
  import { fade, fly } from 'svelte/transition'
  import Icon from './Icon.svelte'
  import { library } from '../store.svelte.js'
  import { t } from '../i18n.svelte.js'

  let { count = 1, onpick, onclose } = $props()

  // the active board first: it is the likeliest destination
  const boards = $derived([
    ...library.boards.filter((b) => b.id === library.activeId),
    ...library.boards.filter((b) => b.id !== library.activeId),
  ])

  function onKey(e) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onclose?.()
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="backdrop" transition:fade={{ duration: 140 }} onclick={onclose} role="presentation"></div>
<div class="sheet" transition:fly={{ y: 24, duration: 200 }} role="dialog" aria-label={t('dumpMoveTitle')}>
  <header>
    <Icon name="moveTo" size={16} />
    <h2>{t('dumpMoveTitle')}</h2>
    <span class="n">{t('dumpMoveCount', { n: count })}</span>
    <button class="icon-btn" onclick={onclose} title={t('close')} aria-label={t('close')}><Icon name="x" size={16} /></button>
  </header>

  <div class="boards">
    {#each boards as b (b.id)}
      <section class="board">
        <h3>
          <span class="bdot" class:active={b.id === library.activeId}></span>
          <span class="bname">{b.name || t('untitled')}</span>
        </h3>
        <ul>
          {#each b.projects as p (p.id)}
            <li>
              <button class="row" style="--card-accent: {p.color};" onclick={() => onpick?.({ projectId: p.id })}>
                <span class="pdot"></span>
                <span class="name">{p.title || t('untitled')}</span>
                <span class="cnt">{p.items.length}</span>
              </button>
            </li>
          {/each}
          <li>
            <button class="row new" onclick={() => onpick?.({ boardId: b.id })}>
              <Icon name="plus" size={13} />
              <span class="name">{t('dumpMoveNewProject')}</span>
            </button>
          </li>
        </ul>
      </section>
    {:else}
      <p class="none">{t('dumpNoBoards')}</p>
    {/each}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 120;
    background: rgba(0, 0, 0, 0.32);
  }
  .sheet {
    position: fixed;
    z-index: 121;
    left: 50%;
    bottom: max(16px, var(--safe-bottom));
    transform: translateX(-50%);
    width: min(440px, calc(100vw - 24px));
    max-height: min(78vh, 640px);
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-pop);
    padding: 12px 14px 12px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }
  header h2 {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
  }
  .n {
    flex: none;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }

  .boards {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 6px;
  }
  .board h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    padding: 8px 6px 4px;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-muted);
    letter-spacing: 0.02em;
  }
  .bdot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--border-strong);
    flex: none;
  }
  .bdot.active {
    background: var(--accent);
  }
  .bname {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    padding: 8px 10px 8px 12px;
    min-height: 38px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    border-radius: var(--radius-xs);
    text-align: left;
    -webkit-tap-highlight-color: transparent;
  }
  .row:hover {
    background: var(--surface-hover);
  }
  .pdot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--card-accent);
    flex: none;
  }
  .name {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cnt {
    flex: none;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }
  .row.new {
    color: var(--text-muted);
    font-weight: 500;
  }
  .row.new:hover {
    color: var(--accent-ink);
    background: var(--accent-soft);
  }
  .none {
    margin: 0;
    padding: 24px 0;
    text-align: center;
    color: var(--text-faint);
    font-size: 13.5px;
  }
</style>
