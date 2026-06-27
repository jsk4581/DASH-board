<script>
  import Icon from './Icon.svelte'
  import { ui, toggleMode, toggleTheme, toggleLang } from '../ui.svelte.js'
  import { exportFile, importFile } from '../store.svelte.js'
  import { undo, redo, history } from '../history.svelte.js'
  import { t } from '../i18n.svelte.js'

  let fileInput = $state(null)
  let toast = $state('')

  function flash(msg) {
    toast = msg
    setTimeout(() => (toast = ''), 2200)
  }

  function onSave() {
    exportFile()
    flash(t('savedToast'))
  }

  // intercept Ctrl/⌘+S so it saves the board instead of Chrome's "save page"
  function onKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 's') {
      e.preventDefault()
      onSave()
    }
  }

  async function onPick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await importFile(file)
      flash(t('loadedToast'))
    } catch (err) {
      flash(t('loadFailed', { msg: err.message }))
    }
    e.target.value = ''
  }
</script>

<svelte:window onkeydown={onKeydown} />

<header class="bar">
  <div class="brand">
    <span class="logo">DASH</span>
    <span class="tagline">Daily Agenda &amp; Schedule Hub</span>
  </div>

  <div class="tools">
    <button
      class="tool icon-only"
      onclick={undo}
      disabled={!history.canUndo}
      title={t('undoTitle')}
      aria-label={t('undo')}
    >
      <Icon name="undo" size={17} />
    </button>
    <button
      class="tool icon-only"
      onclick={redo}
      disabled={!history.canRedo}
      title={t('redoTitle')}
      aria-label={t('redo')}
    >
      <Icon name="redo" size={17} />
    </button>

    <div class="sep"></div>

    <div class="mode-toggle" role="group" aria-label={t('modeSwitch')}>
      <button class:active={ui.mode === 'edit'} onclick={() => ui.mode !== 'edit' && toggleMode()}>
        <Icon name="pencil" size={15} /> {t('edit')}
      </button>
      <button class:active={ui.mode === 'view'} onclick={() => ui.mode !== 'view' && toggleMode()}>
        <Icon name="eye" size={15} /> {t('view')}
      </button>
    </div>

    <div class="sep"></div>

    <button class="tool" onclick={onSave} title={t('saveTitle')}>
      <Icon name="download" size={16} /> <span class="lbl">{t('save')}</span>
    </button>
    <button class="tool" onclick={() => fileInput.click()} title={t('loadTitle')}>
      <Icon name="upload" size={16} /> <span class="lbl">{t('load')}</span>
    </button>
    <input
      type="file"
      accept="application/json,.json"
      bind:this={fileInput}
      onchange={onPick}
      hidden
    />

    <button class="tool" onclick={toggleLang} title={t('langSwitch')} aria-label={t('langSwitch')}>
      <Icon name="globe" size={16} /> <span class="lbl">{t('langName')}</span>
    </button>

    <button class="tool icon-only" onclick={toggleTheme} title={t('themeToggle')} aria-label={t('themeToggle')}>
      <Icon name={ui.theme === 'dark' ? 'sun' : 'moon'} size={16} />
    </button>
  </div>
</header>

{#if toast}
  <div class="toast">{toast}</div>
{/if}

<style>
  .bar {
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 11px clamp(14px, 3vw, 32px);
    background: color-mix(in srgb, var(--surface) 82%, transparent);
    backdrop-filter: saturate(180%) blur(12px);
    -webkit-backdrop-filter: saturate(180%) blur(12px);
    border-bottom: 1px solid var(--border);
  }

  .brand {
    display: flex;
    align-items: baseline;
    gap: 10px;
    min-width: 0;
  }
  .logo {
    font-size: 19px;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: var(--text);
  }
  .tagline {
    font-size: 13px;
    color: var(--text-faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tools {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: none;
  }

  .mode-toggle {
    display: inline-flex;
    background: var(--surface-hover);
    border-radius: var(--radius-sm);
    padding: 2px;
    gap: 2px;
  }
  .mode-toggle button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-muted);
    padding: 5px 11px;
    border-radius: 6px;
    transition: background var(--fast) var(--ease), color var(--fast) var(--ease),
      box-shadow var(--fast) var(--ease);
  }
  .mode-toggle button.active {
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow-sm);
  }

  .sep {
    width: 1px;
    height: 22px;
    background: var(--border);
    margin: 0 2px;
  }

  .tool {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-muted);
    padding: 7px 11px;
    border-radius: var(--radius-sm);
    transition: background var(--fast) var(--ease), color var(--fast) var(--ease);
  }
  .tool:hover {
    background: var(--surface-hover);
    color: var(--text);
  }
  .tool:disabled {
    opacity: 0.3;
    cursor: default;
    pointer-events: none;
  }
  .tool.icon-only {
    padding: 7px;
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
    animation: toast-in 200ms var(--ease);
  }
  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translate(-50%, 8px);
    }
  }

  @media (max-width: 640px) {
    .tagline {
      display: none;
    }
    .tool .lbl {
      display: none;
    }
    .tool {
      padding: 7px;
    }
  }
</style>
