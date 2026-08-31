<script>
  // Memo view: a thread list beside a chat pane. On narrow screens the two
  // stack into a single column and the header's back button returns to the list.
  import { onMount } from 'svelte'
  import Icon from './Icon.svelte'
  import MemoChat from './MemoChat.svelte'
  import { memo, addThread, renameThread, deleteThread, setActive, serializeMemos, mergeMemos } from '../memo.svelte.js'
  import { t } from '../i18n.svelte.js'
  import { ui } from '../ui.svelte.js'
  import { toISODate } from '../date.js'

  let narrow = $state(false)
  let showList = $state(true) // narrow only: list or chat
  let editingId = $state(null)
  let editName = $state('')
  let confirmId = $state(null)
  let fileInput = $state(null)
  let toast = $state('')

  const active = $derived(memo.threads.find((th) => th.id === memo.activeId) ?? null)
  const sorted = $derived([...memo.threads].sort((a, b) => b.updatedAt - a.updatedAt))

  // newest message per thread, for the list previews
  const lastByThread = $derived.by(() => {
    const map = new Map()
    for (const m of memo.messages) {
      const cur = map.get(m.threadId)
      if (!cur || m.ts > cur.ts) map.set(m.threadId, m)
    }
    return map
  })

  onMount(() => {
    const mq = matchMedia('(max-width: 720px)')
    const sync = () => {
      narrow = mq.matches
      if (!narrow) showList = true
    }
    sync()
    mq.addEventListener('change', sync)
    if (narrow && memo.activeId) showList = false
    return () => mq.removeEventListener('change', sync)
  })

  function flash(msg) {
    toast = msg
    setTimeout(() => (toast = ''), 2200)
  }

  function focusNow(el) {
    el.focus()
    el.select()
  }

  function pick(id) {
    setActive(id)
    if (narrow) showList = false
  }
  function onNew() {
    addThread()
    if (narrow) showList = false
  }
  function startRename(th) {
    confirmId = null
    editingId = th.id
    editName = th.title
  }
  function commitRename() {
    if (editingId) renameThread(editingId, editName)
    editingId = null
  }

  function preview(th) {
    const m = lastByThread.get(th.id)
    return m ? m.text.replace(/\s+/g, ' ') : t('noMessages')
  }
  function when(th) {
    const ts = lastByThread.get(th.id)?.ts ?? th.updatedAt
    const d = new Date(ts)
    const today = new Date()
    if (d.toDateString() === today.toDateString())
      return d.toLocaleTimeString(ui.lang, { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString(ui.lang, { month: 'short', day: 'numeric' })
  }

  function onExport() {
    const blob = new Blob([serializeMemos()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dash-memos-${toISODate(new Date())}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    flash(t('memoExported'))
  }
  async function onPick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const n = mergeMemos(JSON.parse(await file.text()))
      flash(t('memoImported', { n }))
    } catch (err) {
      flash(t('loadFailed', { msg: err.message }))
    }
    e.target.value = ''
  }
</script>

<section class="memo" class:narrow class:show-list={showList}>
  <aside class="threads" aria-label={t('threads')}>
    <header class="th-head">
      <h2>{t('threads')}</h2>
      <div class="th-tools">
        <button class="icon-btn" onclick={onExport} title={t('memoExport')} aria-label={t('memoExport')}>
          <Icon name="download" size={15} />
        </button>
        <button class="icon-btn" onclick={() => fileInput.click()} title={t('memoImport')} aria-label={t('memoImport')}>
          <Icon name="upload" size={15} />
        </button>
        <input type="file" accept="application/json,.json" bind:this={fileInput} onchange={onPick} hidden />
        <button class="icon-btn new" onclick={onNew} title={t('newThread')} aria-label={t('newThread')}>
          <Icon name="plus" size={17} />
        </button>
      </div>
    </header>

    {#if !memo.persistent}
      <p class="warn">{t('memoNotPersistent')}</p>
    {/if}

    {#if memo.ready && sorted.length === 0}
      <div class="empty">
        <p>{t('noThreads')}</p>
        <button class="primary" onclick={onNew}><Icon name="plus" size={15} /> {t('newThread')}</button>
      </div>
    {/if}

    <ul class="tlist">
      {#each sorted as th (th.id)}
        <li class="trow" class:active={th.id === memo.activeId}>
          {#if editingId === th.id}
            <input
              class="rename"
              bind:value={editName}
              placeholder={t('threadNamePlaceholder')}
              use:focusNow
              onkeydown={(e) => {
                if (e.key === 'Enter') commitRename()
                else if (e.key === 'Escape') editingId = null
              }}
              onblur={commitRename}
            />
          {:else if confirmId === th.id}
            <span class="confirm-q">{t('confirmDeleteThread', { name: th.title })}</span>
            <div class="acts">
              <button
                class="icon-btn danger"
                onclick={() => {
                  deleteThread(th.id)
                  confirmId = null
                }}
                title={t('delete')}
                aria-label={t('delete')}
              >
                <Icon name="check" size={15} />
              </button>
              <button class="icon-btn" onclick={() => (confirmId = null)} title={t('cancel')} aria-label={t('cancel')}>
                <Icon name="x" size={15} />
              </button>
            </div>
          {:else}
            <button class="pick" onclick={() => pick(th.id)} ondblclick={() => startRename(th)}>
              <span class="row1">
                <span class="title">{th.title}</span>
                <span class="when">{when(th)}</span>
              </span>
              <span class="prev">{preview(th)}</span>
            </button>
            <div class="acts">
              <button class="icon-btn" onclick={() => startRename(th)} title={t('rename')} aria-label={t('rename')}>
                <Icon name="pencil" size={14} />
              </button>
              <button class="icon-btn danger" onclick={() => (confirmId = th.id)} title={t('delete')} aria-label={t('delete')}>
                <Icon name="trash" size={14} />
              </button>
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  </aside>

  <div class="chat">
    {#if active}
      <MemoChat thread={active} {narrow} onback={() => (showList = true)} />
    {:else}
      <div class="chat-empty">
        <Icon name="chat" size={28} />
        <p>{t('pickThread')}</p>
      </div>
    {/if}
  </div>
</section>

{#if toast}
  <div class="toast">{toast}</div>
{/if}

<style>
  .memo {
    height: 100%;
    display: grid;
    grid-template-columns: 272px minmax(0, 1fr);
    gap: 14px;
    padding: 14px clamp(14px, 3vw, 32px) 14px;
    min-height: 0;
  }

  .threads,
  .chat {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .th-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 10px 10px 16px;
    border-bottom: 1px solid var(--border);
  }
  .th-head h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  .th-tools {
    display: flex;
    gap: 2px;
  }
  .icon-btn.new {
    color: var(--accent-ink);
    background: var(--accent-soft);
  }
  .icon-btn.new:hover {
    background: var(--accent);
  }

  .warn {
    margin: 0;
    padding: 8px 14px;
    font-size: 11.5px;
    color: var(--text-muted);
    background: var(--highlight-soft);
  }

  .empty {
    padding: 28px 18px;
    text-align: center;
    color: var(--text-muted);
    font-size: 13.5px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
  }
  .empty p {
    margin: 0;
    line-height: 1.5;
  }
  .primary {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 13px;
    font-weight: 600;
    padding: 8px 14px;
    border-radius: var(--radius-sm);
    background: var(--accent);
    color: var(--accent-ink);
  }
  .primary:hover {
    background: var(--accent-hover);
  }

  .tlist {
    list-style: none;
    margin: 0;
    padding: 6px;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .trow {
    position: relative;
    display: flex;
    align-items: center;
    border-radius: var(--radius-sm);
    transition: background var(--fast) var(--ease);
  }
  .trow:hover {
    background: var(--surface-hover);
  }
  .trow.active {
    background: var(--accent-soft);
  }
  .pick {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: left;
    padding: 9px 10px;
  }
  .row1 {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .title {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .when {
    flex: none;
    font-size: 11px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }
  .prev {
    font-size: 12px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .acts {
    display: flex;
    gap: 1px;
    padding-right: 4px;
    opacity: 0;
    transition: opacity var(--fast) var(--ease);
  }
  .trow:hover .acts,
  .trow:focus-within .acts {
    opacity: 1;
  }
  @media (hover: none) {
    .trow.active .acts {
      opacity: 1;
    }
  }
  .rename {
    flex: 1;
    margin: 4px;
    padding: 7px 9px;
    font-size: 13.5px;
    font-weight: 600;
    border: 1px solid var(--accent);
    border-radius: var(--radius-xs);
    background: var(--surface);
    outline: none;
  }
  .confirm-q {
    flex: 1;
    min-width: 0;
    padding: 8px 10px;
    font-size: 12px;
    line-height: 1.35;
    color: var(--text);
  }
  .confirm-q + .acts {
    opacity: 1;
  }

  .chat-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: var(--text-faint);
    font-size: 14px;
  }
  .chat-empty p {
    margin: 0;
  }

  .toast {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--text);
    color: var(--bg);
    font-size: 14px;
    font-weight: 600;
    padding: 9px 16px;
    border-radius: 99px;
    box-shadow: var(--shadow-pop);
    z-index: 2000;
  }

  @media (max-width: 720px) {
    .memo {
      grid-template-columns: minmax(0, 1fr);
      padding: 10px;
      gap: 0;
    }
    .memo.narrow .chat {
      display: none;
    }
    .memo.narrow:not(.show-list) .threads {
      display: none;
    }
    .memo.narrow:not(.show-list) .chat {
      display: flex;
    }
  }
</style>
