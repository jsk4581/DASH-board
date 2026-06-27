<script>
  import { fly, fade } from 'svelte/transition'
  import Icon from './Icon.svelte'
  import { library, switchBoard, addBoard, renameBoard, removeBoard } from '../store.svelte.js'
  import { t } from '../i18n.svelte.js'

  let { onclose } = $props()

  let editingId = $state(null)
  let editName = $state('')
  let confirmId = $state(null)

  function focusNow(el) {
    el.focus()
    el.select()
  }

  function pick(id) {
    switchBoard(id)
    onclose?.()
  }
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

  <ul class="blist">
    {#each library.boards as b (b.id)}
      <li class="brow" class:active={b.id === library.activeId}>
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

  <footer class="df">
    <button class="newb" onclick={onNew}>
      <Icon name="plus" size={15} /> {t('newBoard')}
    </button>
  </footer>
</aside>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 90;
    background: rgba(0, 0, 0, 0.28);
  }
  .drawer {
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

  .blist {
    list-style: none;
    margin: 0;
    padding: 8px;
    overflow-y: auto;
    flex: 1;
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

  .df {
    padding: 8px;
    border-top: 1px solid var(--border);
  }
  .newb {
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
