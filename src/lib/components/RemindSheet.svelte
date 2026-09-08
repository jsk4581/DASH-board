<script>
  // Highlight reminder settings (app only): on/off, how often, quiet hours.
  import { fade, fly } from 'svelte/transition'
  import Icon from './Icon.svelte'
  import { remind, remindStatus, setRemindEnabled, slotsFor, fmtMin, EVERY_OPTIONS } from '../remind.svelte.js'
  import { onBackButton } from '../platform.js'
  import { t } from '../i18n.svelte.js'

  let { onclose = () => {} } = $props()

  const times = $derived(slotsFor(remind).map(fmtMin))

  $effect(() =>
    onBackButton(() => {
      onclose()
      return true
    })
  )
  // the switch follows the outcome (the permission prompt may refuse it)
  async function toggle(e) {
    const el = e.currentTarget
    await setRemindEnabled(el.checked)
    el.checked = remind.enabled
  }
  function onKey(e) {
    if (e.key === 'Escape') onclose()
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="backdrop" transition:fade={{ duration: 140 }} onclick={onclose} role="presentation"></div>
<div class="sheet" transition:fly={{ y: 24, duration: 200 }} role="dialog" aria-label={t('remindTitle')}>
  <header>
    <Icon name="bell" size={16} />
    <h2>{t('remindTitle')}</h2>
    <button class="icon-btn" onclick={onclose} title={t('close')} aria-label={t('close')}><Icon name="x" size={16} /></button>
  </header>

  <label class="row">
    <span class="lbl">{t('remindOn')}</span>
    <input type="checkbox" class="switch" checked={remind.enabled} onchange={toggle} />
  </label>
  {#if remindStatus.denied && !remind.enabled}
    <p class="note warn">{t('remindDenied')}</p>
  {/if}

  <div class="opts" class:off={!remind.enabled}>
    <label class="row">
      <span class="lbl">{t('remindEvery')}</span>
      <select bind:value={remind.every}>
        {#each EVERY_OPTIONS as m (m)}
          <option value={m}>{t(`every${m}`)}</option>
        {/each}
      </select>
    </label>
    <label class="row">
      <span class="lbl">{t('remindQuiet')}</span>
      <input type="checkbox" class="switch" bind:checked={remind.quiet} />
    </label>
    {#if remind.quiet}
      <div class="row times">
        <input type="time" bind:value={remind.quietStart} aria-label={t('remindQuiet')} />
        <span class="tilde">~</span>
        <input type="time" bind:value={remind.quietEnd} aria-label={t('remindQuiet')} />
      </div>
    {/if}
    <p class="slots">
      <span class="lbl">{t('remindTimes')}</span>
      <span class="list">{times.join(', ')}</span>
    </p>
  </div>
  <p class="note">{t('remindHint')}</p>
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
    overflow-y: auto;
  }
  header {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
    margin-bottom: 6px;
  }
  header h2 {
    flex: 1;
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 40px;
    padding: 2px 0;
  }
  .lbl {
    flex: 1;
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }
  .opts {
    transition: opacity var(--fast) var(--ease);
  }
  .opts.off {
    opacity: 0.45;
    pointer-events: none;
  }
  select,
  input[type='time'] {
    font: inherit;
    font-size: 13.5px;
    color: var(--text);
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-xs);
    padding: 6px 8px;
  }
  .times {
    justify-content: flex-end;
    min-height: 36px;
  }
  .tilde {
    color: var(--text-faint);
  }
  .slots {
    display: flex;
    gap: 10px;
    align-items: baseline;
    margin: 4px 0 0;
    padding: 8px 0 2px;
    border-top: 1px solid var(--border);
  }
  .slots .lbl {
    flex: none;
    font-weight: 600;
    color: var(--text-muted);
    font-size: 13px;
  }
  .list {
    flex: 1;
    text-align: right;
    font-size: 13px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
  .note {
    margin: 10px 0 0;
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--text-faint);
  }
  .note.warn {
    margin-top: 0;
    color: #d92d2d;
  }

  /* a checkbox drawn as a switch */
  .switch {
    appearance: none;
    width: 40px;
    height: 24px;
    margin: 0;
    border-radius: 12px;
    background: var(--border-strong);
    position: relative;
    cursor: pointer;
    flex: none;
    transition: background var(--fast) var(--ease);
  }
  .switch::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--surface);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
    transition: transform var(--fast) var(--ease);
  }
  .switch:checked {
    background: var(--accent);
  }
  .switch:checked::after {
    transform: translateX(16px);
  }
  .switch:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
