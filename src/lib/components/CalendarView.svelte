<script>
  import { monthGrid, weekdayNames } from '../date.js'
  import { viewport } from '../media.svelte.js'
  import { t } from '../i18n.svelte.js'

  // items: flattened, each with { id, text, status, due, start, projectColor, projectTitle }
  // month: any Date inside the month to show; selected/onselect drive the
  // phone layout, where a cell only carries marks and the tapped day's items
  // are listed below the grid (DayAgenda)
  let { items, month = new Date(), selected = null, onselect = () => {} } = $props()

  const days = $derived(monthGrid(month))
  const narrow = $derived(viewport.narrow)

  const isRange = (it) => it.start && it.start < it.due

  const byDay = $derived.by(() => {
    const map = {}
    for (const d of days) map[d.iso] = []
    // a ranged item (start..due) appears on every day of its span; ISO dates
    // compare correctly as strings, so no Date parsing is needed
    for (const it of items) {
      const lo = isRange(it) ? it.start : it.due
      for (const d of days) {
        if (d.iso >= lo && d.iso <= it.due) map[d.iso].push(it)
      }
    }
    return map
  })

  // phone layout: one dot per item on every day it covers (ranged items
  // included), capped so the cell stays a fixed height
  const MAX_DOTS = 4
  function marks(iso) {
    const list = byDay[iso]
    return { dots: list.slice(0, MAX_DOTS), more: Math.max(0, list.length - MAX_DOTS) }
  }
</script>

<div class="cal" class:narrow role="grid" aria-label={t('calendarAria')}>
  <div class="cal-head" role="row">
    {#each weekdayNames() as name, dow}
      <span class="wd" class:sun={dow === 0} class:sat={dow === 6} role="columnheader">{name}</span>
    {/each}
  </div>
  {#each days as d (d.iso)}
    <div
      class="col"
      class:today={d.isToday}
      class:weekend={d.isWeekend}
      class:outside={!d.inMonth}
      class:sel={narrow && selected === d.iso}
      role="gridcell"
      onclick={() => narrow && onselect(d.iso)}
    >
      <div class="col-head">
        <span class="dnum">{d.day}</span>
      </div>
      {#if narrow}
        {@const m = marks(d.iso)}
        <div class="marks">
          {#each m.dots as it (it.id)}
            <span
              class="dot"
              class:done={it.status === 'done'}
              class:highlight={it.status === 'highlight'}
              style="--c: {it.projectColor};"
            ></span>
          {/each}
          {#if m.more}<span class="more">+{m.more}</span>{/if}
        </div>
      {:else}
        <div class="chips">
          {#each byDay[d.iso] as it (it.id)}
            <div
              class="chip"
              class:done={it.status === 'done'}
              class:highlight={it.status === 'highlight'}
              style="--c: {it.projectColor};"
              title="{it.projectTitle} · {it.text}"
            >
              <span class="chip-dot"></span>
              <span class="chip-text">{it.text}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .cal {
    /* one month: 7 columns × 5 or 6 rows, plus the weekday header row */
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
    padding: 4px 2px 8px;
  }
  .cal-head {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
    padding-bottom: 2px;
  }
  .wd {
    text-align: center;
    font-size: 12px;
    color: var(--text-faint);
  }
  .wd.sun {
    color: oklch(0.6 0.17 27);
  }
  .wd.sat {
    color: oklch(0.58 0.13 255);
  }
  .col {
    min-height: 82px;
    /* let the grid track shrink to an equal 1fr instead of expanding to fit a
       chip's nowrap text (which forced wide columns → 7-day overflow → Fri/Sat
       got clipped by the timeline's overflow:hidden) */
    min-width: 0;
    border-radius: var(--radius-sm);
    background: var(--surface-2);
    border: 1px solid var(--border);
    padding: 7px 6px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: background var(--med) var(--ease);
  }
  .col.weekend {
    background: color-mix(in srgb, var(--surface-2) 70%, var(--bg));
  }
  .col.outside {
    background: transparent;
    border-color: transparent;
  }
  .col.outside .dnum {
    color: var(--text-faint);
  }
  .col.outside .chip,
  .col.outside .marks {
    opacity: 0.55;
  }
  .col.today {
    border-color: var(--highlight);
    box-shadow: inset 0 0 0 1px var(--highlight);
    background: var(--highlight-soft);
  }

  .col-head {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }
  .dnum {
    font-size: 16px;
    font-weight: 700;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }

  .chips {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .chip {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    font-size: 12px;
    line-height: 1.3;
    padding: 3px 5px;
    border-radius: var(--radius-xs);
    background: var(--surface);
    border: 1px solid var(--border);
    overflow: hidden;
  }
  .chip-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--c);
    flex: none;
  }
  .chip-text {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .chip.done .chip-text {
    text-decoration: line-through;
    color: var(--done);
  }
  .chip.highlight {
    border-color: var(--pencil);
    box-shadow: inset 0 0 0 0.5px var(--pencil);
  }
  .chip.highlight .chip-text {
    font-weight: 700;
  }

  /* phones: a cell is too narrow for any text, so it only carries marks (the
     project colour, the red highlight ring, done as hollow), one per item per
     day, and the tapped day's items are listed below the grid. */
  .cal.narrow {
    gap: 3px;
    padding: 4px 0 6px;
  }
  .cal.narrow .cal-head {
    gap: 3px;
  }
  .cal.narrow .wd {
    font-size: 10.5px;
  }
  .cal.narrow .col {
    min-height: 48px;
    padding: 4px 3px 5px;
    gap: 4px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .cal.narrow .dnum {
    font-size: 12.5px;
  }
  .cal.narrow .col.sel {
    border-color: var(--accent-ink);
    box-shadow: inset 0 0 0 1px var(--accent-ink);
  }
  .cal.narrow .col.sel .dnum {
    color: var(--accent-ink);
  }
  .marks {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 3px;
    min-height: 6px;
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--c);
    flex: none;
  }
  .dot.done {
    background: transparent;
    box-shadow: inset 0 0 0 1.5px var(--c);
    opacity: 0.6;
  }
  .dot.highlight {
    box-shadow: 0 0 0 1.5px var(--pencil);
    width: 5px;
    height: 5px;
  }
  .more {
    font-size: 9px;
    line-height: 1;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }
</style>
