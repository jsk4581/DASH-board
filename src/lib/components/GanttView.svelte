<script>
  import { horizon, dayDiff, startOfDay, addDays, relativeTag, weekdayLabel, monthLabel } from '../date.js'
  import { viewport } from '../media.svelte.js'
  import { t } from '../i18n.svelte.js'

  // projects: full project list (each with items). The gantt is one strip of
  // fixed-width day columns, 4 weeks back and 8 weeks ahead, that scrolls
  // horizontally behind a sticky label column; it opens scrolled to today.
  let { projects } = $props()

  const BACK = 28, AHEAD = 56
  const N = BACK + AHEAD
  const base = $derived(startOfDay(addDays(new Date(), -BACK)))
  const days = $derived(horizon(N, base))
  const dayW = $derived(viewport.narrow ? 40 : 48)

  function rowFor(it) {
    if (!it.due) return null
    let dueIdx = dayDiff(base, it.due)
    let startIdx = it.start ? dayDiff(base, it.start) : dueIdx
    startIdx = Math.min(startIdx, dueIdx)
    if (dueIdx < 0 || startIdx > N - 1) return null
    const clipLeft = startIdx < 0
    const clipRight = dueIdx > N - 1
    startIdx = Math.max(0, startIdx)
    dueIdx = Math.min(N - 1, dueIdx)
    return { startIdx, dueIdx, clipLeft, clipRight }
  }

  // [{ project, rows: [{ item, geom }] }] keeping only projects with dated items
  const groups = $derived(
    projects
      .map((p) => ({
        project: p,
        rows: p.items.map((it) => ({ item: it, geom: rowFor(it) })).filter((r) => r.geom),
      }))
      .filter((g) => g.rows.length > 0)
  )

  let scroller = $state(null)
  let awayFromToday = $state(false)

  // today's column sits right after the label column, with yesterday peeking
  function scrollToToday(smooth = false) {
    scroller?.scrollTo({ left: (BACK - 1) * dayW, behavior: smooth ? 'smooth' : 'auto' })
  }
  $effect(() => {
    if (scroller) scrollToToday()
  })
  function onScroll() {
    awayFromToday = Math.abs(scroller.scrollLeft - (BACK - 1) * dayW) > dayW * 3
  }
</script>

<div class="gantt" style="--day-w: {dayW}px; --n: {N};" bind:this={scroller} onscroll={onScroll}>
  <!-- header -->
  <div class="grow head">
    <div class="label corner">
      {#if awayFromToday}
        <button class="today-btn" onclick={() => scrollToToday(true)}>{t('backToToday')}</button>
      {/if}
    </div>
    <div class="track head-track">
      {#each days as d, i (d.iso)}
        <div class="hcell" class:today={d.isToday} class:weekend={d.isWeekend}>
          {#if d.isFirstOfMonth || i === 0}<span class="hmon">{monthLabel(d.month)}</span>{/if}
          <span class="hwd" class:sun={d.dow === 0} class:sat={d.dow === 6}>{weekdayLabel(d.dow)}</span>
          <span class="hnum">{d.day}</span>
        </div>
      {/each}
    </div>
  </div>

  {#if groups.length === 0}
    <p class="empty">{t('ganttEmpty')}</p>
  {/if}

  {#each groups as g (g.project.id)}
    <div class="group-label" style="--c: {g.project.color};">
      <span class="gdot"></span>{g.project.title}
    </div>
    {#each g.rows as r (r.item.id)}
      <div class="grow">
        <div class="label" title={r.item.text}>{r.item.text}</div>
        <div class="track">
          {#each days as d, i (d.iso)}
            <!-- pinned to its column: auto-placement would skip past the bar's
                 span and shift every later cell's shading one bar to the right -->
            <div class="bgcell" class:today={d.isToday} class:weekend={d.isWeekend} style="grid-column: {i + 1};"></div>
          {/each}
          <div
            class="bar"
            class:done={r.item.status === 'done'}
            class:highlight={r.item.status === 'highlight'}
            class:clip-left={r.geom.clipLeft}
            class:clip-right={r.geom.clipRight}
            style="--c: {g.project.color}; grid-column: {r.geom.startIdx + 1} / {r.geom.dueIdx + 2};"
          >
            <span class="bar-tag">{relativeTag(r.item.due)}</span>
          </div>
        </div>
      </div>
    {/each}
  {/each}
</div>

<style>
  .gantt {
    --label-w: clamp(88px, 12vw, 180px);
    overflow-x: auto;
    padding-bottom: 6px;
    scrollbar-width: thin;
  }
  .grow {
    display: grid;
    grid-template-columns: var(--label-w) calc(var(--day-w) * var(--n));
    align-items: stretch;
    width: max-content;
  }
  /* the label column stays put while the day strip scrolls under it */
  .label {
    position: sticky;
    left: 0;
    z-index: 2;
    background: var(--surface);
    padding: 6px 10px 6px 2px;
    font-size: 13.5px;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
  }
  @media (max-width: 560px) {
    .label {
      font-size: 12.5px;
      padding-right: 6px;
    }
  }
  .corner {
    align-items: flex-end;
    padding-bottom: 8px;
  }
  .today-btn {
    font-size: 12px;
    font-weight: 700;
    color: var(--accent-ink);
    background: var(--accent-soft);
    padding: 4px 10px;
    border-radius: 99px;
    transition: background var(--fast) var(--ease);
  }
  .today-btn:hover {
    background: var(--accent);
  }
  .track {
    display: grid;
    grid-template-columns: repeat(var(--n), var(--day-w));
    position: relative;
    border-left: 1px solid var(--border);
  }
  .head-track .hcell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    position: relative;
    padding: 16px 0 6px;
    border-right: 1px solid var(--border);
    gap: 1px;
  }
  .hmon {
    position: absolute;
    top: 2px;
    left: 4px;
    font-size: 10px;
    font-weight: 700;
    color: var(--text-muted);
    white-space: nowrap;
  }
  .hcell.weekend {
    background: color-mix(in srgb, var(--surface-2) 60%, var(--bg));
  }
  .hcell.today {
    background: var(--highlight-soft);
  }
  .hwd {
    font-size: 11px;
    color: var(--text-faint);
  }
  .hwd.sun {
    color: oklch(0.6 0.17 27);
  }
  .hwd.sat {
    color: oklch(0.58 0.13 255);
  }
  .hnum {
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .hcell.today .hnum {
    color: var(--text);
  }

  /* background cells live in the same grid track so bars overlay them */
  .bgcell {
    grid-row: 1;
    border-right: 1px solid var(--border);
    min-height: 30px;
  }
  .bgcell.weekend {
    background: color-mix(in srgb, var(--surface-2) 50%, var(--bg));
  }
  .bgcell.today {
    background: var(--highlight-soft);
  }

  .bar {
    grid-row: 1;
    align-self: center;
    height: 18px;
    margin: 6px 2px;
    border-radius: 99px;
    background: var(--c);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 7px;
    box-shadow: var(--shadow-sm);
    position: relative;
    z-index: 1;
    transition: filter var(--fast) var(--ease);
  }
  .bar:hover {
    filter: brightness(1.06);
  }
  .bar-tag {
    font-size: 10.5px;
    font-weight: 700;
    color: var(--text);
    opacity: 0.6;
    white-space: nowrap;
  }
  .bar.done {
    opacity: 0.45;
    background: var(--done);
  }
  .bar.highlight {
    box-shadow: 0 0 0 1.5px var(--pencil);
  }
  .bar.clip-left {
    border-top-left-radius: 3px;
    border-bottom-left-radius: 3px;
  }
  .bar.clip-right {
    border-top-right-radius: 3px;
    border-bottom-right-radius: 3px;
  }

  .group-label {
    position: sticky;
    left: 0;
    width: max-content;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 700;
    color: var(--text-muted);
    padding: 9px 2px 3px;
    margin-top: 2px;
  }
  .gdot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--c);
  }

  .empty {
    text-align: center;
    color: var(--text-faint);
    padding: 28px 0;
    font-size: 14px;
  }
</style>
