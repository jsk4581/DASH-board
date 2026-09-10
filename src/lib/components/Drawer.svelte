<script>
  import { fly, fade } from 'svelte/transition'
  import { flip } from 'svelte/animate'
  import { dragHandleZone, dragHandle } from 'svelte-dnd-action'
  import Icon from './Icon.svelte'
  import { library, switchBoard, addBoard, renameBoard, removeBoard, setBoards } from '../store.svelte.js'
  import { ui, setView } from '../ui.svelte.js'
  import { t } from '../i18n.svelte.js'
  import { onBackButton } from '../platform.js'

  let { onclose } = $props()

  // hardware back (apps): close the drawer instead of leaving the app
  $effect(() =>
    onBackButton(() => {
      onclose?.()
      return true
    })
  )

  let editingId = $state(null)
  let editName = $state('')
  let confirmId = $state(null)

  // boards reorder by their grip (the row's own drag order is the library's)
  const FLIP = 150
  function handleReorder(e) {
    setBoards(e.detail.items)
  }

  function focusNow(el) {
    el.focus()
    el.select()
  }

  function pick(id) {
    switchBoard(id)
    setView('board')
    onclose?.()
  }
  function pickRemind() {
    setView('remind')
    onclose?.()
  }
  // items picked for the reminder notification, across every board
  const remindCount = $derived(
    library.boards.reduce((n, b) => n + b.projects.reduce((m, p) => m + p.items.filter((it) => it.remind).length, 0), 0)
  )
  function startRename(b) {
    confirmId = null
    editingId = b.id
    editName = b.name
  }
  function commitRename() {
    if (editingId) {
      const name = editName.trim()
      if (name) renameBoard(editingId, name)
    }
    editingId = null
  }
  function onNew() {
    addBoard()
    onclose?.()
  }

  function onKey(e) {
    if (e.key === 'Escape' && editingId == null && confirmId == null) onclose?.()
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="backdrop" transition:fade={{ duration: 140 }} onclick={onclose} role="presentation"></div>

<aside class="drawer" transition:fly={{ x: -320, duration: 200 }} aria-label={t('boards')}>
  <header class="dh">
    <h2>{t('boards')}</h2>
    <button class="icon-btn" onclick={onclose} title={t('close')} aria-label={t('close')}>
      <Icon name="chevronLeft" size={18} />
    </button>
  </header>

  <div class="dbody">
  <ul
    class="blist"
    use:dragHandleZone={{
      items: library.boards,
      type: 'boards',
      dragDisabled: editingId != null || confirmId != null,
      flipDurationMs: FLIP,
      dropTargetStyle: {},
    }}
    onconsider={handleReorder}
    onfinalize={handleReorder}
  >
    {#each library.boards as b (b.id)}
      <li class="brow" class:active={b.id === library.activeId && !['remind', 'dump'].includes(ui.view)} animate:flip={{ duration: FLIP }}>
        {#if editingId === b.id}
          <input
            class="rename"
            bind:value={editName}
            use:focusNow
            onkeydown={(e) => {
              if (e.key === 'Enter') commitRename()
              else if (e.key === 'Escape') {
                e.stopPropagation()
                editingId = null
              }
            }}
            onblur={commitRename}
          />
        {:else if confirmId === b.id}
          <span class="confirm-q" title={t('confirmDeleteBoard', { name: b.name })}>
            {t('confirmDeleteBoard', { name: b.name })}
          </span>
          <div class="acts">
            <button
              class="icon-btn sm danger"
              onclick={() => {
                removeBoard(b.id)
                confirmId = null
              }}
              aria-label={t('deleteBoard')}
            >
              <Icon name="check" size={14} />
            </button>
            <button class="icon-btn sm" onclick={() => (confirmId = null)} aria-label={t('close')}>
              <Icon name="x" size={14} />
            </button>
          </div>
        {:else}
          <button class="bname" onclick={() => pick(b.id)} title={b.name}>
            <span class="bdot"></span>
            <span class="btext">{b.name || t('untitled')}</span>
            <span class="bcount">{b.projects.length}</span>
          </button>
          <div class="acts">
            <span class="grip" use:dragHandle title={t('dragMove')} aria-label={t('boardGrip')}>
              <Icon name="grip" size={14} />
            </span>
            <button class="icon-btn sm" onclick={() => startRename(b)} title={t('rename')} aria-label={t('rename')}>
              <Icon name="pencil" size={13} />
            </button>
            <button
              class="icon-btn sm"
              onclick={() => (confirmId = b.id)}
              title={t('deleteBoard')}
              aria-label={t('deleteBoard')}
            >
              <Icon name="trash" size={13} />
            </button>
          </div>
        {/if}
      </li>
    {/each}
  </ul>

  <button class="newb" onclick={onNew}>
    <Icon name="plus" size={15} /> {t('newBoard')}
  </button>

  <!-- the pinned Reminders tab (items picked across every board): same row
       geometry as a board row, the icon centred on the dot column so the
       labels line up -->
  <div class="tabs">
    <div class="brow" class:active={ui.view === 'remind'}>
      <button class="bname" onclick={pickRemind}>
        <span class="slot"><Icon name="bell" size={14} strokeWidth={2.5} /></span>
        <span class="btext">{t('remindTab')}</span>
        <span class="bcount">{remindCount}</span>
      </button>
    </div>
  </div>
  </div>
</aside>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 90;
    background: rgba(0, 0, 0, 0.28);
  }
  .drawer {
    padding-top: var(--safe-top);
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 91;
    width: min(300px, 84vw);
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border-right: 1px solid var(--border);
    box-shadow: var(--shadow-pop);
  }

  .dh {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 12px 12px 16px;
    border-bottom: 1px solid var(--border);
  }
  .dh h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
  }

  .dbody {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }
  .blist {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .brow {
    display: flex;
    align-items: center;
    gap: 4px;
    border-radius: var(--radius-sm);
    padding: 2px 4px 2px 2px;
    min-height: 36px;
  }
  .brow:hover {
    background: var(--surface-hover);
  }
  .brow.active {
    background: var(--accent-soft);
  }

  .bname {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
    padding: 7px 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    border-radius: var(--radius-xs);
    text-align: left;
  }
  .bdot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex: none;
    background: var(--border-strong);
  }
  .brow.active .bdot {
    background: var(--accent);
  }
  .btext {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bcount {
    flex: none;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }

  /* the icon of a pinned row sits in the dot's 7px column */
  .slot {
    width: 7px;
    flex: none;
    display: flex;
    justify-content: center;
    color: var(--text-muted);
  }
  .brow.active .slot {
    color: var(--accent);
  }
  .tabs {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .acts {
    display: flex;
    gap: 1px;
    flex: none;
    opacity: 0;
    transition: opacity var(--fast) var(--ease);
  }
  .brow:hover .acts,
  .brow.active .acts {
    opacity: 1;
  }
  /* no hover on touch: the grip and tools stay out so every board can be dragged */
  @media (hover: none) {
    .acts {
      opacity: 1;
    }
  }
  .grip {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    color: var(--text-faint);
    cursor: grab;
    touch-action: none;
  }
  .grip:active {
    cursor: grabbing;
  }
  .icon-btn.sm {
    width: 24px;
    height: 24px;
  }
  .icon-btn.sm.danger {
    color: #d92d2d;
  }

  .rename {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    font-weight: 600;
    padding: 7px 8px;
    border: 1px solid var(--accent);
    border-radius: var(--radius-xs);
    background: var(--surface);
    color: var(--text);
    outline: none;
  }
  .confirm-q {
    flex: 1;
    min-width: 0;
    font-size: 12.5px;
    color: var(--text);
    padding-left: 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .newb {
    margin-top: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 10px;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-muted);
    border: 1.5px dashed var(--border-strong);
    border-radius: var(--radius-sm);
    transition: color var(--fast) var(--ease), border-color var(--fast) var(--ease),
      background var(--fast) var(--ease);
  }
  .newb:hover {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--accent-soft);
  }
</style>
