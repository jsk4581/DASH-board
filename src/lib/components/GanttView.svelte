<script>
  import { horizon, dayDiff, startOfDay, relativeTag, weekdayLabel } from '../date.js'
  import { t } from '../i18n.svelte.js'

  // projects: full project list (each with items)
  let { projects, from = undefined } = $props()

  const days = $derived(horizon(14, from))
  const base = $derived(startOfDay(from ?? new Date()))

  function rowFor(it) {
    if (!it.due) return null
    const dueIdx = dayDiff(base, it.due)
    if (dueIdx < 0 || dueIdx > 13) return null
    let startIdx = it.start ? dayDiff(base, it.start) : dueIdx
    const clipLeft = startIdx < 0
    startIdx = Math.max(0, Math.min(startIdx, dueIdx))
    return { startIdx, dueIdx, clipLeft }
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
</script>

<div class="gantt">
  <!-- header -->
  <div class="grow head">
    <div class="label"></div>
    <div class="track head-track">
      {#each days as d (d.iso)}
        <div class="hcell" class:today={d.isToday} class:weekend={d.isWeekend}>
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
          {#each days as d}
            <div class="bgcell" class:today={d.isToday} class:weekend={d.isWeekend}></div>
          {/each}
          <div
            class="bar"
            class:done={r.item.status === 'done'}
            class:highlight={r.item.status === 'highlight'}
            class:clip-left={r.geom.clipLeft}
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
    --label-w: clamp(120px, 18vw, 200px);
    overflow-x: auto;
    padding-bottom: 6px;
  }
  .grow {
    display: grid;
    grid-template-columns: var(--label-w) minmax(420px, 1fr);
    align-items: stretch;
    min-width: 0;
  }
  .label {
    padding: 6px 10px 6px 2px;
    font-size: 13.5px;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
  }

  .track {
    display: grid;
    grid-template-columns: repeat(14, 1fr);
    position: relative;
    border-left: 1px solid var(--border);
  }
  .head-track .hcell {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4px 0 6px;
    border-right: 1px solid var(--border);
    gap: 1px;
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
    grid-column: span 1;
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

  .group-label {
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
