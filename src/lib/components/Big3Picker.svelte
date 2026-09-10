<script>
  // Pick the Big 3: every board's items (and the Dump's), a tick per item,
  // at most three ticked at once.
  import { fade, fly } from 'svelte/transition'
  import Icon from './Icon.svelte'
  import { library, big3Items, toggleBig3, BIG3_MAX, DUMP_ID } from '../store.svelte.js'
  import { formatShort } from '../date.js'
  import { onBackButton } from '../platform.js'
  import { t } from '../i18n.svelte.js'

  let { onclose } = $props()

  const count = $derived(big3Items().length)
  const full = $derived(count >= BIG3_MAX)
  const groups = $derived([
    ...library.boards.flatMap((b) =>
      b.projects.filter((p) => p.items.length > 0).map((p) => ({ pid: p.id, title: p.title, color: p.color, board: library.boards.length > 1 ? b.name : '', items: p.items }))
    ),
    ...(library.dump.items.length ? [{ pid: DUMP_ID, title: t('dumpTab'), color: 'oklch(0.36 0.008 286)', board: '', items: library.dump.items }] : []),
  ])

  $effect(() =>
    onBackButton(() => {
      onclose?.()
      return true
    })
  )
  function onKey(e) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onclose?.()
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="backdrop" transition:fade={{ duration: 140 }} onclick={onclose} role="presentation"></div>
<div class="sheet" transition:fly={{ y: 24, duration: 200 }} role="dialog" aria-label={t('big3PickTitle')}>
  <header>
    <Icon name="flag" size={16} />
    <h2>{t('big3PickTitle')}</h2>
    <span class="n" class:full>{t('big3Count', { n: count })}</span>
    <button class="icon-btn" onclick={onclose} title={t('close')} aria-label={t('close')}><Icon name="x" size={16} /></button>
  </header>
  {#if full}<p class="note">{t('big3Full')}</p>{/if}

  <div class="groups">
    {#each groups as g (g.pid)}
      <section class="group" style="--card-accent: {g.color};">
        <h3>
          <span class="pdot"></span>
          <span class="pname">{g.title || t('untitled')}</span>
          {#if g.board}<span class="bname">{g.board}</span>{/if}
        </h3>
        <ul>
          {#each g.items as it (it.id)}
            <li>
              <button
                class="row"
                class:on={it.big3}
                class:done={it.status === 'done'}
                disabled={!it.big3 && full}
                onclick={() => toggleBig3(g.pid, it.id)}
                aria-pressed={it.big3}
              >
                <span class="tick">{#if it.big3}<Icon name="check" size={12} strokeWidth={3} />{/if}</span>
                <span class="text">{it.text}</span>
                {#if it.due}<span class="due">{formatShort(it.due)}</span>{/if}
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {:else}
      <p class="none">{t('big3PickEmpty')}</p>
    {/each}
  </div>
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
    width: min(460px, calc(100vw - 24px));
    max-height: min(80vh, 680px);
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
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }
  header h2 {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
  }
  .n {
    flex: none;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }
  .n.full {
    color: var(--accent-ink);
  }
  .note {
    margin: 8px 0 0;
    font-size: 12.5px;
    color: var(--text-muted);
  }

  .groups {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-top: 6px;
  }
  .group h3 {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 0;
    padding: 8px 6px 4px;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-muted);
  }
  .pdot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--card-accent);
    flex: none;
  }
  .pname {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bname {
    flex: none;
    font-weight: 600;
    color: var(--text-faint);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    padding: 6px 8px 6px 10px;
    min-height: 36px;
    border-radius: var(--radius-xs);
    text-align: left;
    color: var(--text);
    -webkit-tap-highlight-color: transparent;
  }
  .row:hover:not(:disabled) {
    background: var(--surface-hover);
  }
  .row.on {
    background: var(--accent-soft);
  }
  .row:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .tick {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 5px;
    border: 1.5px solid var(--border-strong);
    color: var(--accent-ink);
    flex: none;
    transition: background var(--fast) var(--ease), border-color var(--fast) var(--ease);
  }
  .row.on .tick {
    background: var(--accent);
    border-color: var(--accent);
  }
  .text {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    overflow-wrap: anywhere;
  }
  .row.done .text {
    color: var(--done);
    text-decoration: line-through;
  }
  .row.on .text {
    font-weight: 600;
    color: var(--accent-ink);
  }
  .due {
    flex: none;
    font-size: 11.5px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }
  .none {
    margin: 0;
    padding: 24px 0;
    text-align: center;
    color: var(--text-faint);
    font-size: 13.5px;
  }
</style>
