<script>
  import { untrack } from 'svelte'
  import Popover from './Popover.svelte'
  import Icon from './Icon.svelte'
  import { horizon, formatLabel, weekdayNames } from '../date.js'
  import { setItemDates, clearItemDates } from '../store.svelte.js'
  import { t } from '../i18n.svelte.js'

  let { pid, item, anchor, onclose } = $props()

  const days = horizon(14)
  const idxOf = (iso) => days.findIndex((d) => d.iso === iso)

  // initial selection captured once when the popover opens (intentional one-time read)
  const initDue = untrack(() => (item.due ? idxOf(item.due) : -1))
  const initStart = untrack(() => (item.start ? idxOf(item.start) : -1))

  // selection as horizon indices; drag overrides
  let a = $state(initStart >= 0 ? initStart : initDue)
  let b = $state(initDue)
  let dragging = $state(false)
  let dragAnchor = $state(-1)

  const lo = $derived(Math.min(a, b))
  const hi = $derived(Math.max(a, b))
  const inRange = (i) => a >= 0 && b >= 0 && i >= lo && i <= hi

  function commit(i, j) {
    const start = Math.min(i, j)
    const end = Math.max(i, j)
    a = start
    b = end
    if (start === end) {
      setItemDates(pid, item.id, { start: null, due: days[end].iso })
    } else {
      setItemDates(pid, item.id, { start: days[start].iso, due: days[end].iso })
    }
  }

  function onDown(i) {
    dragging = true
    dragAnchor = i
    a = i
    b = i
  }
  function onEnter(i) {
    if (dragging) b = i
  }
  function onUp(i) {
    if (dragging) {
      commit(dragAnchor, i)
      dragging = false
    }
  }

  function clear() {
    a = -1
    b = -1
    clearItemDates(pid, item.id)
  }

  const summary = $derived(
    item.start && item.due && item.start !== item.due
      ? `${formatLabel(item.start)} → ${formatLabel(item.due)}`
      : item.due
        ? formatLabel(item.due)
        : t('noDue')
  )
</script>

<svelte:window onpointerup={() => (dragging = false)} />

<Popover {anchor} {onclose}>
  <div class="dp">
    <div class="dp-head">
      <span class="dp-summary">{summary}</span>
      <button class="icon-btn" onclick={clear} title={t('clearDue')} aria-label={t('clear')}>
        <Icon name="x" size={15} />
      </button>
    </div>

    <div class="dp-weekdays">
      {#each weekdayNames() as w}
        <span class="dp-wd">{w}</span>
      {/each}
    </div>

    <div class="dp-grid">
      {#each days as d, i}
        <button
          class="dp-day"
          class:today={d.isToday}
          class:weekend={d.isWeekend}
          class:sel={inRange(i)}
          class:edge-l={inRange(i) && i === lo}
          class:edge-r={inRange(i) && i === hi}
          onpointerdown={() => onDown(i)}
          onpointerenter={() => onEnter(i)}
          onpointerup={() => onUp(i)}
        >
          {d.day}
        </button>
      {/each}
    </div>
    <p class="dp-hint">{t('dateHint')}</p>
  </div>
</Popover>

<style>
  .dp {
    width: 232px;
    user-select: none;
  }
  .dp-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }
  .dp-summary {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text);
  }
  .dp-weekdays,
  .dp-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 3px;
  }
  .dp-wd {
    text-align: center;
    font-size: 11.5px;
    color: var(--text-faint);
    padding-bottom: 2px;
  }
  .dp-day {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-xs);
    font-size: 13.5px;
    color: var(--text);
    transition: background var(--fast) var(--ease), color var(--fast) var(--ease);
  }
  .dp-day:hover {
    background: var(--surface-hover);
  }
  .dp-day.weekend {
    color: var(--text-muted);
  }
  .dp-day.today {
    box-shadow: inset 0 0 0 1.5px var(--accent-ink);
    font-weight: 700;
  }
  .dp-day.sel {
    background: var(--accent-soft);
    color: var(--text);
    font-weight: 600;
    border-radius: 0;
  }
  .dp-day.sel.edge-l {
    border-top-left-radius: var(--radius-xs);
    border-bottom-left-radius: var(--radius-xs);
  }
  .dp-day.sel.edge-r {
    border-top-right-radius: var(--radius-xs);
    border-bottom-right-radius: var(--radius-xs);
  }
  .dp-day.sel.today {
    background: var(--accent);
    color: var(--accent-ink);
  }
  .dp-hint {
    margin: 8px 0 0;
    font-size: 11.5px;
    color: var(--text-faint);
    text-align: center;
  }
</style>
