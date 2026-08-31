<script>
  // One thread: day-grouped bubbles plus a composer. Everything here is "me",
  // so bubbles sit on the right like a saved-messages chat.
  import { tick } from 'svelte'
  import Icon from './Icon.svelte'
  import { memo, sendMessage, editMessage, deleteMessage } from '../memo.svelte.js'
  import { t } from '../i18n.svelte.js'
  import { ui } from '../ui.svelte.js'

  let { thread, narrow = false, onback } = $props()

  let draft = $state('')
  let composer = $state(null)
  let scroller = $state(null)
  let editingId = $state(null)
  let editText = $state('')
  let confirmId = $state(null)
  let lastSeen = { threadId: null, count: 0 } // to pick between "jump" and "stay" on change

  const touch = typeof matchMedia !== 'undefined' && matchMedia('(hover: none)').matches

  const msgs = $derived(
    memo.messages.filter((m) => m.threadId === thread.id).sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : 1))
  )

  // group by calendar day
  const groups = $derived.by(() => {
    const out = []
    let cur = null
    for (const m of msgs) {
      const key = new Date(m.ts).toDateString()
      if (!cur || cur.key !== key) {
        cur = { key, label: dayLabel(m.ts), msgs: [] }
        out.push(cur)
      }
      cur.msgs.push(m)
    }
    return out
  })

  function dayLabel(ts) {
    const d = new Date(ts)
    const today = new Date()
    const y = new Date(today)
    y.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return t('today')
    if (d.toDateString() === y.toDateString()) return t('yesterday')
    const opts = { month: 'long', day: 'numeric', weekday: 'short' }
    if (d.getFullYear() !== today.getFullYear()) opts.year = 'numeric'
    return d.toLocaleDateString(ui.lang, opts)
  }
  function timeLabel(ts) {
    return new Date(ts).toLocaleTimeString(ui.lang, { hour: '2-digit', minute: '2-digit' })
  }

  // plain text, with bare URLs made clickable
  const URL_RE = /(https?:\/\/[^\s<>"']+)/g
  function parts(text) {
    const out = []
    let last = 0
    for (const m of text.matchAll(URL_RE)) {
      if (m.index > last) out.push({ text: text.slice(last, m.index) })
      out.push({ text: m[0], href: m[0] })
      last = m.index + m[0].length
    }
    if (last < text.length) out.push({ text: text.slice(last) })
    return out
  }

  function nearBottom() {
    if (!scroller) return true
    return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80
  }
  async function scrollToEnd(smooth = false) {
    await tick()
    scroller?.scrollTo({ top: scroller.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }

  // jump to the end on thread switch; on new messages only if already near the end
  $effect(() => {
    const n = msgs.length
    const id = thread.id
    if (lastSeen.threadId !== id) {
      lastSeen = { threadId: id, count: n }
      editingId = null
      confirmId = null
      scrollToEnd()
    } else if (n > lastSeen.count) {
      lastSeen.count = n
      if (nearBottom()) scrollToEnd(true)
    } else {
      lastSeen.count = n
    }
  })

  function autosize(el) {
    const fit = () => {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 180) + 'px'
    }
    el.addEventListener('input', fit)
    fit()
    return { destroy: () => el.removeEventListener('input', fit) }
  }

  function send() {
    if (sendMessage(thread.id, draft)) {
      draft = ''
      tick().then(() => {
        if (composer) {
          composer.style.height = 'auto'
          composer.focus()
        }
        scrollToEnd(true)
      })
    }
  }
  function onComposerKey(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !touch) {
      e.preventDefault()
      send()
    }
  }

  function startEdit(m) {
    confirmId = null
    editingId = m.id
    editText = m.text
  }
  function commitEdit() {
    if (editingId) editMessage(editingId, editText)
    editingId = null
  }
  function onEditKey(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !touch) {
      e.preventDefault()
      commitEdit()
    } else if (e.key === 'Escape') {
      editingId = null
    }
  }
  function focusEnd(el) {
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 240) + 'px'
  }
</script>

<header class="ch-head">
  {#if narrow}
    <button class="icon-btn" onclick={onback} title={t('backToThreads')} aria-label={t('backToThreads')}>
      <Icon name="chevronLeft" size={18} />
    </button>
  {/if}
  <h2>{thread.title}</h2>
  <span class="meta">{t('threadMeta', { n: msgs.length })}</span>
</header>

<div class="scroll" bind:this={scroller}>
  {#if msgs.length === 0}
    <p class="none">{t('noMessages')}</p>
  {/if}
  {#each groups as g (g.key)}
    <div class="day"><span>{g.label}</span></div>
    {#each g.msgs as m (m.id)}
      <div class="row" class:editing={editingId === m.id}>
        {#if editingId === m.id}
          <div class="bubble edit">
            <textarea bind:value={editText} use:focusEnd use:autosize onkeydown={onEditKey}></textarea>
            <div class="edit-acts">
              <button class="ghost" onclick={() => (editingId = null)}>{t('cancel')}</button>
              <button class="primary" onclick={commitEdit}>{t('saveEdit')}</button>
            </div>
          </div>
        {:else}
          <div class="tools">
            {#if confirmId === m.id}
              <button
                class="icon-btn danger"
                onclick={() => {
                  deleteMessage(m.id)
                  confirmId = null
                }}
                title={t('delete')}
                aria-label={t('delete')}
              >
                <Icon name="check" size={14} />
              </button>
              <button class="icon-btn" onclick={() => (confirmId = null)} title={t('cancel')} aria-label={t('cancel')}>
                <Icon name="x" size={14} />
              </button>
            {:else}
              <button class="icon-btn" onclick={() => startEdit(m)} title={t('editMsg')} aria-label={t('editMsg')}>
                <Icon name="pencil" size={14} />
              </button>
              <button class="icon-btn danger" onclick={() => (confirmId = m.id)} title={t('delete')} aria-label={t('delete')}>
                <Icon name="trash" size={14} />
              </button>
            {/if}
          </div>
          <div class="stamp">
            {#if m.editedAt}<span class="edited">{t('edited')}</span>{/if}
            <time datetime={new Date(m.ts).toISOString()}>{timeLabel(m.ts)}</time>
          </div>
          <div class="bubble">
            {#each parts(m.text) as p}
              {#if p.href}<a href={p.href} target="_blank" rel="noopener noreferrer">{p.text}</a>{:else}{p.text}{/if}
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  {/each}
</div>

<footer class="composer">
  <textarea
    bind:this={composer}
    bind:value={draft}
    use:autosize
    rows="1"
    placeholder={t('composerPlaceholder')}
    onkeydown={onComposerKey}
    aria-label={t('composerPlaceholder')}
  ></textarea>
  <button class="send" onclick={send} disabled={!draft.trim()} title={t('send')} aria-label={t('send')}>
    <Icon name="send" size={17} />
  </button>
  {#if !touch}<span class="hint">{t('composerHint')}</span>{/if}
</footer>

<style>
  .ch-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px 10px 14px;
    border-bottom: 1px solid var(--border);
  }
  .ch-head h2 {
    margin: 0;
    font-size: 14.5px;
    font-weight: 700;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .meta {
    margin-left: auto;
    flex: none;
    font-size: 11.5px;
    color: var(--text-faint);
  }

  .scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 14px 16px 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: var(--surface-2);
  }
  .none {
    margin: auto;
    color: var(--text-faint);
    font-size: 13.5px;
  }
  .day {
    display: flex;
    justify-content: center;
    margin: 10px 0 6px;
  }
  .day span {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    background: var(--surface-hover);
    padding: 3px 10px;
    border-radius: 99px;
  }

  .row {
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    gap: 6px;
  }
  .bubble {
    max-width: min(72%, 640px);
    padding: 8px 12px;
    border-radius: 14px 14px 4px 14px;
    background: var(--accent-soft);
    color: var(--text);
    font-size: 14px;
    line-height: 1.5;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .bubble a {
    color: var(--accent-ink);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .stamp {
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 10.5px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
    padding-bottom: 3px;
  }
  .edited {
    font-size: 10px;
  }
  .tools {
    display: flex;
    gap: 1px;
    opacity: 0;
    transition: opacity var(--fast) var(--ease);
    padding-bottom: 2px;
  }
  .row:hover .tools,
  .row:focus-within .tools {
    opacity: 1;
  }
  @media (hover: none) {
    .tools {
      opacity: 1;
    }
  }

  .bubble.edit {
    max-width: min(88%, 720px);
    width: 100%;
    background: var(--surface);
    border: 1px solid var(--accent);
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .bubble.edit textarea {
    width: 100%;
    resize: none;
    border: none;
    outline: none;
    background: transparent;
    font-size: 14px;
    line-height: 1.5;
    padding: 2px 4px;
  }
  .edit-acts {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }
  .edit-acts button {
    font-size: 12.5px;
    font-weight: 600;
    padding: 5px 10px;
    border-radius: var(--radius-xs);
  }
  .edit-acts .ghost {
    color: var(--text-muted);
  }
  .edit-acts .ghost:hover {
    background: var(--surface-hover);
    color: var(--text);
  }
  .edit-acts .primary {
    background: var(--accent);
    color: var(--accent-ink);
  }
  .edit-acts .primary:hover {
    background: var(--accent-hover);
  }

  .composer {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 8px;
    padding: 10px 12px;
    border-top: 1px solid var(--border);
    background: var(--surface);
  }
  .composer textarea {
    width: 100%;
    max-height: 180px;
    resize: none;
    padding: 9px 12px;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    background: var(--surface-2);
    outline: none;
    font-size: 14px;
    line-height: 1.45;
    transition: border-color var(--fast) var(--ease);
  }
  .composer textarea:focus {
    border-color: var(--accent);
  }
  .send {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--accent-ink);
    transition: background var(--fast) var(--ease), transform var(--fast) var(--ease);
  }
  .send:hover:not(:disabled) {
    background: var(--accent-hover);
  }
  .send:active:not(:disabled) {
    transform: scale(0.94);
  }
  .send:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .hint {
    grid-column: 1 / -1;
    font-size: 10.5px;
    color: var(--text-faint);
    padding-left: 4px;
  }

  @media (max-width: 720px) {
    .bubble {
      max-width: 86%;
    }
    .scroll {
      padding: 10px 10px 6px;
    }
  }
</style>
