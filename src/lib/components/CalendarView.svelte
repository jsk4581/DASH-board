<script>
  import { horizon, weekdayLabel, monthLabel } from '../date.js'
  import { t } from '../i18n.svelte.js'

  // items: flattened, each with { id, text, status, due, projectColor, projectTitle }
  let { items, from = undefined } = $props()

  const days = $derived(horizon(28, from))

  const byDay = $derived.by(() => {
    const map = {}
    for (const d of days) map[d.iso] = []
    for (const it of items) {
      if (map[it.due]) map[it.due].push(it)
    }
    return map
  })
</script>

<div class="cal" role="grid" aria-label={t('calendarAria')}>
  {#each days as d (d.iso)}
    <div class="col" class:today={d.isToday} class:weekend={d.isWeekend}>
      <div class="col-head">
        {#if d.isFirstOfMonth}<span class="month">{monthLabel(d.month)}</span>{/if}
        <span class="wd" class:sun={d.dow === 0} class:sat={d.dow === 6}>{weekdayLabel(d.dow)}</span>
        <span class="dnum">{d.day}</span>
      </div>
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
    </div>
  {/each}
</div>

<style>
  .cal {
    /* 4주 = 7열 × 4행 */
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
    padding: 4px 2px 8px;
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
  .col.today {
    border-color: var(--highlight);
    box-shadow: inset 0 0 0 1px var(--highlight);
    background: var(--highlight-soft);
  }

  .col-head {
    display: flex;
    align-items: baseline;
    gap: 4px;
    position: relative;
  }
  .month {
    position: absolute;
    top: -2px;
    left: 0;
    font-size: 10.5px;
    font-weight: 700;
    color: var(--text-muted);
  }
  .wd {
    font-size: 12px;
    color: var(--text-faint);
    margin-left: auto;
  }
  .wd.sun {
    color: oklch(0.6 0.17 27);
  }
  .wd.sat {
    color: oklch(0.58 0.13 255);
  }
  .dnum {
    font-size: 16px;
    font-weight: 700;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .col.today .dnum {
    color: var(--text);
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

  /* phones: shrink the 7-column grid's metrics so all 7 days genuinely fit the
     viewport. Without this the columns' min-content (driven by the bold day
     number + weekday label) overflows the narrow width and the timeline's
     `overflow:hidden` clips the rightmost days (Fri/Sat). */
  @media (max-width: 560px) {
    .cal {
      gap: 3px;
      padding: 4px 0 8px;
    }
    .col {
      min-height: 62px;
      padding: 5px 3px;
      gap: 4px;
    }
    .col-head {
      gap: 2px;
    }
    .month {
      font-size: 9px;
    }
    .wd {
      font-size: 9.5px;
    }
    .dnum {
      font-size: 12.5px;
    }
    .chips {
      gap: 2px;
    }
    .chip {
      font-size: 10.5px;
      padding: 2px 3px;
      gap: 3px;
    }
    .chip-dot {
      width: 5px;
      height: 5px;
    }
  }
</style>
