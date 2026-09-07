<script>
  // "Send to memos": pick the thread a shared text goes into (or start one).
  import { fade, fly } from 'svelte/transition'
  import Icon from './Icon.svelte'
  import { memo, addThread, sendMessage, openThread } from '../memo.svelte.js'
  import { share } from '../share.svelte.js'
  import { setView } from '../ui.svelte.js'
  import { onBackButton } from '../platform.js'
  import { t } from '../i18n.svelte.js'

  const sorted = $derived([...memo.threads].sort((a, b) => b.updatedAt - a.updatedAt))
  let picked = $state(null) // thread id, or 'new'

  $effect(() => {
    // default to the last-used thread, else a new one
    picked = memo.activeId && memo.threads.some((th) => th.id === memo.activeId) ? memo.activeId : 'new'
  })
  $effect(() =>
    onBackButton(() => {
      close()
      return true
    })
  )

  function close() {
    share.pending = null
  }
  function send() {
    const body = share.pending?.body
    if (!body) return close()
    const tid = picked === 'new' ? addThread(share.pending.title?.trim() || t('newThread')) : picked
    sendMessage(tid, body)
    share.pending = null
    setView('memo')
    openThread(tid)
  }
  function onKey(e) {
    if (e.key === 'Escape') close()
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="backdrop" transition:fade={{ duration: 140 }} onclick={close} role="presentation"></div>
<div class="sheet" transition:fly={{ y: 24, duration: 200 }} role="dialog" aria-label={t('shareTitle')}>
  <header>
    <Icon name="chat" size={16} />
    <h2>{t('shareTitle')}</h2>
    <button class="icon-btn" onclick={close} title={t('close')} aria-label={t('close')}><Icon name="x" size={16} /></button>
  </header>
  <p class="preview">{share.pending?.body}</p>
  <p class="q">{t('sharePick')}</p>
  <ul class="threads">
    <li>
      <button class="row" class:sel={picked === 'new'} onclick={() => (picked = 'new')}>
        <Icon name="plus" size={14} /> <span class="name">{t('shareNew')}</span>
      </button>
    </li>
    {#each sorted as th (th.id)}
      <li>
        <button class="row" class:sel={picked === th.id} onclick={() => (picked = th.id)}>
          <span class="dot"></span><span class="name">{th.title}</span>
        </button>
      </li>
    {/each}
  </ul>
  <footer>
    <button class="ghost" onclick={close}>{t('shareCancel')}</button>
    <button class="primary" onclick={send}><Icon name="send" size={14} /> {t('shareSend')}</button>
  </footer>
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
  }
  header h2 {
    flex: 1;
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
  }
  .preview {
    margin: 10px 0 0;
    padding: 9px 11px;
    font-size: 13.5px;
    line-height: 1.45;
    color: var(--text);
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    max-height: 7.2em;
    overflow-y: auto;
  }
  .q {
    margin: 12px 0 4px;
    font-size: 12.5px;
    color: var(--text-faint);
  }
  .threads {
    list-style: none;
    margin: 0;
    padding: 0;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    border-radius: var(--radius-xs);
    text-align: left;
  }
  .row:hover {
    background: var(--surface-hover);
  }
  .row.sel {
    background: var(--accent-soft);
    color: var(--accent-ink);
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--border-strong);
    flex: none;
  }
  .row.sel .dot {
    background: var(--accent);
  }
  .name {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
  }
  .ghost,
  .primary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: var(--radius-sm);
    font-size: 13.5px;
    font-weight: 600;
  }
  .ghost {
    color: var(--text-muted);
  }
  .ghost:hover {
    background: var(--surface-hover);
  }
</style>
