<script>
  import Icon from './Icon.svelte'
  import SyncPopover from './SyncPopover.svelte'
  import Drawer from './Drawer.svelte'
  import Popover from './Popover.svelte'
  import { ui, toggleMode, toggleTheme, toggleLang, setView } from '../ui.svelte.js'
  import { exportFile, importFile, board } from '../store.svelte.js'
  import { undo, redo, history } from '../history.svelte.js'
  import { sync } from '../sync.svelte.js'
  import { t } from '../i18n.svelte.js'
  import { isNative } from '../platform.js'

  let fileInput = $state(null)
  let toast = $state('')
  let syncBtn = $state(null)
  let showSync = $state(false)
  let showDrawer = $state(false)
  let moreBtn = $state(null)
  let showMore = $state(false)
  let barH = $state(0)

  const onBoard = $derived(ui.view === 'board')

  // the memo view sizes itself to the space under this bar
  $effect(() => {
    document.documentElement.style.setProperty('--bar-h', `${barH}px`)
  })

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
    if (!onBoard) return
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

<header class="bar" bind:offsetHeight={barH}>
  {#if onBoard}
    <button
      class="tool icon-only drawer-btn"
      onclick={() => (showDrawer = true)}
      title={t('boardsTooltip')}
      aria-label={t('boardsTooltip')}
    >
      <Icon name="sidebar" size={18} />
    </button>
  {/if}
  <div class="brand">
    <span class="logo">DASH</span>
    {#if onBoard}
      <button class="cur-board" onclick={() => (showDrawer = true)} title={t('boardsTooltip')}>
        {board.name}
      </button>
    {/if}
  </div>

  <div class="mode-toggle view-switch" role="group" aria-label={t('viewSwitch')}>
    <button class:active={onBoard} onclick={() => setView('board')} title={t('boardView')}>
      <Icon name="grid" size={15} /> <span class="lbl">{t('boardView')}</span>
    </button>
    <button class:active={!onBoard} onclick={() => setView('memo')} title={t('memoView')}>
      <Icon name="chat" size={15} /> <span class="lbl">{t('memoView')}</span>
    </button>
  </div>

  <div class="tools">
    {#if onBoard}
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
        <button class:active={ui.mode === 'edit'} onclick={() => ui.mode !== 'edit' && toggleMode()} title={t('edit')}>
          <Icon name="pencil" size={15} /> <span class="lbl">{t('edit')}</span>
        </button>
        <button class:active={ui.mode === 'view'} onclick={() => ui.mode !== 'view' && toggleMode()} title={t('view')}>
          <Icon name="eye" size={15} /> <span class="lbl">{t('view')}</span>
        </button>
      </div>

      <div class="sep wide"></div>

      <button class="tool wide" onclick={onSave} title={t('saveTitle')}>
        <Icon name="download" size={16} /> <span class="lbl">{t('save')}</span>
      </button>
      <button class="tool wide" onclick={() => fileInput.click()} title={t('loadTitle')}>
        <Icon name="upload" size={16} /> <span class="lbl">{t('load')}</span>
      </button>
      <input
        type="file"
        accept="application/json,.json"
        bind:this={fileInput}
        onchange={onPick}
        hidden
      />
    {/if}

    {#if !isNative}
      <button
        class="tool icon-only sync-btn"
        bind:this={syncBtn}
        onclick={() => (showSync = !showSync)}
        title={t('syncTooltip')}
        aria-label={t('syncTooltip')}
      >
        <Icon name="cloud" size={17} />
        {#if sync.connected || sync.status !== 'idle'}
          <span class="sync-pip {sync.status}"></span>
        {/if}
      </button>
    {/if}

    <button class="tool wide" onclick={toggleLang} title={t('langSwitch')} aria-label={t('langSwitch')}>
      <Icon name="globe" size={16} /> <span class="lbl">{t('langName')}</span>
    </button>

    <button class="tool icon-only wide" onclick={toggleTheme} title={t('themeToggle')} aria-label={t('themeToggle')}>
      <Icon name={ui.theme === 'dark' ? 'sun' : 'moon'} size={16} />
    </button>

    <!-- phones: the rarely-used tools fold into one menu so the row fits -->
    <button
      class="tool icon-only narrow more-btn"
      bind:this={moreBtn}
      onclick={() => (showMore = !showMore)}
      title={t('more')}
      aria-label={t('more')}
    >
      <Icon name="more" size={17} />
    </button>
  </div>
</header>

{#if showMore}
  <Popover anchor={moreBtn} onclose={() => (showMore = false)} placement="bottom-end">
    <div class="menu">
      {#if onBoard}
        <button onclick={() => { showMore = false; onSave() }}>
          <Icon name="download" size={16} /> {t('save')}
        </button>
        <button onclick={() => { showMore = false; fileInput.click() }}>
          <Icon name="upload" size={16} /> {t('load')}
        </button>
      {/if}
      <button onclick={toggleLang}>
        <Icon name="globe" size={16} /> {t('langName')}
      </button>
      <button onclick={toggleTheme}>
        <Icon name={ui.theme === 'dark' ? 'sun' : 'moon'} size={16} /> {t(ui.theme === 'dark' ? 'lightTheme' : 'darkTheme')}
      </button>
    </div>
  </Popover>
{/if}

{#if showDrawer}
  <Drawer onclose={() => (showDrawer = false)} />
{/if}

{#if showSync}
  <SyncPopover anchor={syncBtn} onclose={() => (showSync = false)} />
{/if}

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
    justify-content: flex-start;
    gap: 12px;
    padding: 11px clamp(14px, 3vw, 32px);
    padding-top: calc(11px + var(--safe-top));
    background: color-mix(in srgb, var(--surface) 82%, transparent);
    backdrop-filter: saturate(180%) blur(12px);
    -webkit-backdrop-filter: saturate(180%) blur(12px);
    border-bottom: 1px solid var(--border);
  }

  .drawer-btn {
    flex: none;
    margin-right: 2px;
  }
  .brand {
    display: flex;
    align-items: baseline;
    gap: 9px;
    min-width: 0;
  }
  .logo {
    font-size: 19px;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: var(--text);
    flex: none;
  }
  .cur-board {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-muted);
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    max-width: 40vw;
    transition: background var(--fast) var(--ease), color var(--fast) var(--ease);
  }
  .cur-board:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  .tools {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: none;
    margin-left: auto;
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

  .view-switch {
    flex: none;
  }
  .narrow {
    display: none;
  }
  .menu {
    display: flex;
    flex-direction: column;
    min-width: 168px;
  }
  .menu button {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text);
    padding: 9px 10px;
    border-radius: var(--radius-sm);
    text-align: left;
  }
  .menu button:hover {
    background: var(--surface-hover);
  }
  .view-switch button {
    padding: 5px 9px;
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

  .sync-btn {
    position: relative;
  }
  .sync-pip {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    border: 1.5px solid var(--surface);
    background: var(--text-faint);
  }
  .sync-pip.synced {
    background: #37b24d;
  }
  .sync-pip.syncing {
    background: var(--accent);
  }
  .sync-pip.error,
  .sync-pip.conflict {
    background: #d92d2d;
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
    .tool .lbl,
    .mode-toggle:not(.view-switch) .lbl {
      display: none;
    }
    .mode-toggle:not(.view-switch) button {
      padding: 5px 9px;
    }
    .wide {
      display: none;
    }
    .narrow {
      display: inline-flex;
    }
    .bar {
      gap: 6px;
      flex-wrap: wrap;
      padding-top: calc(9px + var(--safe-top));
      padding-bottom: 9px;
    }
    .cur-board {
      max-width: none;
      flex: 1;
    }
    .brand {
      flex: 1;
    }
    .tools {
      gap: 2px;
    }
    /* the view switch takes its own full-width row under the tools */
    .view-switch {
      order: 10;
      flex-basis: 100%;
      display: flex;
    }
    .view-switch button {
      flex: 1;
      justify-content: center;
    }
    .tool {
      padding: 7px;
    }
  }
</style>
