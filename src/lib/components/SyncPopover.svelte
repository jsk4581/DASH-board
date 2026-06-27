<script>
  import Popover from './Popover.svelte'
  import Icon from './Icon.svelte'
  import { sync, connect, pull, pushNow, disconnect } from '../sync.svelte.js'
  import { t } from '../i18n.svelte.js'

  let { anchor, onclose } = $props()

  let token = $state('')
  let gistId = $state('')
  let copied = $state(false)

  const tokenUrl = 'https://github.com/settings/tokens/new?scopes=gist&description=DASH%20sync'

  const errorMsg = $derived.by(() => {
    switch (sync.error) {
      case 'bad-token':
        return t('errBadToken')
      case 'no-gist':
      case 'empty-gist':
        return t('errNoGist')
      case 'forbidden':
        return t('errForbidden')
      case 'no-token':
        return ''
      default:
        return sync.error ? t('errGeneric') : ''
    }
  })

  const statusText = $derived.by(() => {
    switch (sync.status) {
      case 'syncing':
        return t('statusSyncing')
      case 'synced':
        return t('statusSynced')
      case 'offline':
        return t('statusOffline')
      case 'conflict':
        return t('statusConflict')
      case 'error':
        return t('statusError')
      default:
        return ''
    }
  })

  const lastTime = $derived(
    sync.lastSyncedAt ? new Date(sync.lastSyncedAt).toLocaleTimeString() : ''
  )

  async function onConnect() {
    await connect({ token, gistId })
    if (sync.connected) {
      token = ''
      gistId = ''
    }
  }

  async function copyId() {
    try {
      await navigator.clipboard.writeText(sync.gistId)
      copied = true
      setTimeout(() => (copied = false), 1400)
    } catch {
      /* ignore */
    }
  }
</script>

<Popover {anchor} {onclose} placement="bottom-end">
  <div class="sync">
    {#if !sync.connected}
      <h3 class="sync-h">{t('syncTitle')}</h3>
      <p class="desc">{t('syncDesc')}</p>

      <label class="fld">
        <span>{t('tokenLabel')}</span>
        <input
          type="password"
          bind:value={token}
          placeholder="ghp_…"
          autocomplete="off"
          spellcheck="false"
        />
      </label>
      <label class="fld">
        <span>{t('gistIdLabel')}</span>
        <input
          type="text"
          bind:value={gistId}
          placeholder={t('gistIdPlaceholder')}
          autocomplete="off"
          spellcheck="false"
        />
      </label>

      {#if errorMsg}<p class="err">{errorMsg}</p>{/if}

      <button
        class="primary"
        onclick={onConnect}
        disabled={sync.status === 'syncing' || !token.trim()}
      >
        {sync.status === 'syncing' ? t('connecting') : t('connect')}
      </button>

      <div class="hint">
        <a href={tokenUrl} target="_blank" rel="noopener noreferrer">{t('createToken')}</a>
        <span>{t('tokenScopeHint')}</span>
      </div>
      <p class="warn">{t('tokenWarning')}</p>
    {:else}
      <div class="status">
        <span class="pip {sync.status}"></span>
        <span class="st-txt">{statusText}</span>
      </div>
      {#if errorMsg}<p class="err">{errorMsg}</p>{/if}
      {#if sync.lastSyncedAt && sync.status === 'synced'}
        <p class="muted">{t('lastSyncedAt', { time: lastTime })}</p>
      {/if}

      {#if sync.status === 'conflict'}
        <p class="conflict">{t('conflictMsg')}</p>
        <div class="row">
          <button class="primary sm" onclick={pushNow}>{t('useThisDevice')}</button>
          <button class="ghost sm" onclick={pull}>{t('useCloud')}</button>
        </div>
      {/if}

      <label class="fld">
        <span>{t('gistIdLabel')}</span>
        <div class="id-row">
          <input type="text" readonly value={sync.gistId} />
          <button class="ghost sm" onclick={copyId}>{copied ? t('copied') : t('copyId')}</button>
        </div>
      </label>

      <div class="row">
        <button class="ghost" onclick={pull} disabled={sync.status === 'syncing'}>
          <Icon name="refresh" size={14} /> {t('pullFromCloud')}
        </button>
        <button class="ghost danger" onclick={disconnect}>{t('disconnect')}</button>
      </div>
    {/if}
  </div>
</Popover>

<style>
  .sync {
    width: 268px;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .sync-h {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
  }
  .desc {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-muted);
  }

  .fld {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .fld > span {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-muted);
  }
  .fld input {
    width: 100%;
    font-size: 13px;
    padding: 7px 9px;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    background: var(--surface-2);
    color: var(--text);
    outline: none;
    transition: border-color var(--fast) var(--ease);
  }
  .fld input:focus {
    border-color: var(--accent);
  }
  .fld input[readonly] {
    color: var(--text-muted);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11.5px;
  }
  .id-row {
    display: flex;
    gap: 6px;
  }
  .id-row input {
    min-width: 0;
    flex: 1;
  }

  button {
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    border-radius: var(--radius-sm);
    padding: 8px 12px;
    transition: background var(--fast) var(--ease), color var(--fast) var(--ease),
      border-color var(--fast) var(--ease);
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  button.sm {
    padding: 6px 9px;
    font-size: 12px;
  }
  .primary {
    background: var(--accent);
    color: var(--accent-ink);
    border: 1px solid var(--accent);
  }
  .primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }
  .ghost {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    background: transparent;
    color: var(--text-muted);
    border: 1px solid var(--border-strong);
  }
  .ghost:hover:not(:disabled) {
    background: var(--surface-hover);
    color: var(--text);
  }
  .ghost.danger:hover:not(:disabled) {
    color: #d92d2d;
    border-color: #d92d2d;
  }
  .row {
    display: flex;
    gap: 6px;
  }
  .row > button {
    flex: 1;
  }

  .hint {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    font-size: 11.5px;
    color: var(--text-faint);
  }
  .hint a {
    color: var(--accent);
    font-weight: 600;
    text-decoration: none;
  }
  .hint a:hover {
    text-decoration: underline;
  }
  .warn {
    margin: 0;
    font-size: 11px;
    line-height: 1.45;
    color: var(--text-faint);
  }
  .err {
    margin: 0;
    font-size: 12px;
    color: #d92d2d;
  }
  .muted {
    margin: 0;
    font-size: 11.5px;
    color: var(--text-faint);
  }
  .conflict {
    margin: 0;
    font-size: 12px;
    line-height: 1.45;
    color: var(--text);
    background: var(--highlight-soft);
    border-radius: var(--radius-sm);
    padding: 7px 9px;
  }

  .status {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .st-txt {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }
  .pip {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex: none;
    background: var(--text-faint);
  }
  .pip.synced {
    background: #37b24d;
  }
  .pip.syncing {
    background: var(--accent);
  }
  .pip.offline {
    background: var(--text-faint);
  }
  .pip.error,
  .pip.conflict {
    background: #d92d2d;
  }
</style>
