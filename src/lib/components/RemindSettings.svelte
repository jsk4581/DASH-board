<script>
  // Notification settings card (Reminders tab): on/off and the times of day.
  // On the web the times are hidden: notifications only come from the app.
  import Icon from './Icon.svelte'
  import { remind, remindStatus, setRemindEnabled, addTime, removeTime, MAX_TIMES } from '../remind.svelte.js'
  import { isNative } from '../platform.js'
  import { t } from '../i18n.svelte.js'

  // the switch follows the outcome (the permission prompt may refuse it)
  async function toggle(e) {
    const el = e.currentTarget
    await setRemindEnabled(el.checked)
    el.checked = remind.enabled
  }
</script>

<section class="card" aria-label={t('remindTitle')}>
  <header>
    <Icon name="bell" size={15} />
    <h2>{t('remindTitle')}</h2>
  </header>
  {#if !isNative}
    <p class="note">{t('remindWebNote')}</p>
  {:else}
    <label class="row">
      <span class="lbl">{t('remindOn')}</span>
      <input type="checkbox" class="switch" checked={remind.enabled} onchange={toggle} />
    </label>
    {#if remindStatus.denied && !remind.enabled}
      <p class="note warn">{t('remindDenied')}</p>
    {/if}
    <div class="opts" class:off={!remind.enabled}>
      <p class="sub">{t('remindTimes')}</p>
      <ul class="times">
        {#each remind.times as _, i (i)}
          <li class="row time">
            <input type="time" bind:value={remind.times[i]} aria-label={t('remindTimes')} />
            <button class="icon-btn" onclick={() => removeTime(i)} title={t('remindRemove')} aria-label={t('remindRemove')}>
              <Icon name="x" size={14} />
            </button>
          </li>
        {/each}
      </ul>
      {#if remind.times.length === 0}
        <p class="note warn">{t('remindNoTimes')}</p>
      {/if}
      {#if remind.times.length < MAX_TIMES}
        <button class="add" onclick={addTime}><Icon name="plus" size={14} /> {t('remindAdd')}</button>
      {/if}
    </div>
    <p class="note">{t('remindHint')}</p>
  {/if}
</section>

<style>
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
    padding: 12px 14px 12px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
    margin-bottom: 4px;
  }
  header h2 {
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
  input[type='time'] {
    font: inherit;
    font-size: 14px;
    color: var(--text);
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-xs);
    padding: 6px 10px;
    font-variant-numeric: tabular-nums;
  }
  .sub {
    margin: 6px 0 2px;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-muted);
  }
  .times {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .row.time {
    min-height: 36px;
    justify-content: space-between;
  }
  .add {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    padding: 7px 12px;
    border-radius: var(--radius-sm);
    border: 1px dashed var(--border-strong);
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 600;
  }
  .add:hover {
    background: var(--surface-hover);
    color: var(--text);
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
