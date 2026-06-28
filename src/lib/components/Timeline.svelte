<script>
  import { tick } from 'svelte'
  import { vslide } from '../pop.js'
  import Icon from './Icon.svelte'
  import CalendarView from './CalendarView.svelte'
  import GanttView from './GanttView.svelte'
  import { board } from '../store.svelte.js'
  import { ui, setTimelineView } from '../ui.svelte.js'
  import { t } from '../i18n.svelte.js'
  import { addDays, toISODate, formatShort } from '../date.js'

  // flattened dated items (for the calendar)
  const dated = $derived(
    board.projects.flatMap((p) =>
      p.items
        .filter((it) => it.due)
        .map((it) => ({
          id: it.id,
          text: it.text,
          status: it.status,
          due: it.due,
          start: it.start,
          projectColor: p.color,
          projectTitle: p.title,
        }))
    )
  )

  // date navigation: page the timeline window back/forward by a week
  const STEP = 7
  let offsetDays = $state(0)
  let dir = $state(1) // slide direction: +1 forward (next), -1 backward (prev)
  // true ONLY during the render caused by a date step → animate then. Stays false
  // on first paint and on a view toggle (calendar↔gantt), so neither slides.
  let paging = $state(false)
  const spanDays = $derived(ui.timelineView === 'calendar' ? 28 : 14)

  function page(by) {
    paging = true
    offsetDays += by
    tick().then(() => (paging = false))
  }
  function step(by) {
    dir = by > 0 ? 1 : -1
    page(by)
  }
  function reset() {
    if (offsetDays === 0) return
    dir = offsetDays > 0 ? -1 : 1
    page(-offsetDays)
  }
  const from = $derived(addDays(new Date(), offsetDays))
  const rangeLabel = $derived(
    `${formatShort(toISODate(from))} – ${formatShort(toISODate(addDays(from, spanDays - 1)))}`
  )
  const subtitle = $derived(
    offsetDays === 0 ? (ui.timelineView === 'calendar' ? t('next4w') : t('next2w')) : rangeLabel
  )
</script>

<section class="timeline">
  <header class="tl-head">
    <div class="tl-title">
      <Icon name="calendar" size={16} />
      <h2>{t('schedule')}</h2>
      <span class="tl-sub">{subtitle}</span>
    </div>

    <div class="view-toggle" role="group" aria-label={t('timelineSwitch')}>
      <button
        class:active={ui.timelineView === 'calendar'}
        onclick={() => setTimelineView('calendar')}
      >
        <Icon name="grid" size={14} /> {t('calendar')}
      </button>
      <button class:active={ui.timelineView === 'gantt'} onclick={() => setTimelineView('gantt')}>
        <Icon name="gantt" size={14} /> {t('gantt')}
      </button>
    </div>
  </header>

  <div class="tl-body">
    {#if ui.timelineView === 'calendar'}
      <!-- calendar pages vertically (whole 4-week grid) -->
      <div class="tl-viewport">
        {#key offsetDays}
          <div
            class="tl-vslide"
            in:vslide={{ dir, mode: 'in', nav: paging }}
            out:vslide={{ dir, mode: 'out', nav: paging }}
          >
            <CalendarView items={dated} {from} />
          </div>
        {/key}
      </div>
    {:else}
      <!-- gantt keeps its left label column and slides only the date tracks (internally) -->
      <GanttView projects={board.projects} {from} {dir} {paging} />
    {/if}
  </div>

  <nav class="tl-nav" aria-label={t('schedule')}>
    <button class="nav-arrow" onclick={() => step(-STEP)} aria-label={t('prevPeriod')} title={t('prevPeriod')}>
      <Icon name="chevronLeft" size={18} />
    </button>
    <button
      class="nav-range"
      class:dim={offsetDays === 0}
      onclick={reset}
      title={t('backToToday')}
    >
      {rangeLabel}
    </button>
    <button class="nav-arrow" onclick={() => step(STEP)} aria-label={t('nextPeriod')} title={t('nextPeriod')}>
      <Icon name="chevron" size={18} />
    </button>
  </nav>
</section>

<style>
  .timeline {
    margin: 14px clamp(14px, 3vw, 32px) 28px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }
  .tl-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
  }
  .tl-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
  }
  .tl-title h2 {
    font-size: 15px;
    font-weight: 700;
    margin: 0;
    color: var(--text);
  }
  .tl-sub {
    font-size: 12.5px;
    color: var(--text-faint);
    font-weight: 500;
  }

  .view-toggle {
    display: inline-flex;
    background: var(--surface-hover);
    border-radius: var(--radius-sm);
    padding: 2px;
    gap: 2px;
  }
  .view-toggle button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
    padding: 5px 11px;
    border-radius: 6px;
    transition: background var(--fast) var(--ease), color var(--fast) var(--ease),
      box-shadow var(--fast) var(--ease);
  }
  .view-toggle button.active {
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow-sm);
  }

  .tl-body {
    padding: 12px 16px 8px;
    overflow: hidden;
  }
  .tl-viewport {
    position: relative; /* containing block for the pinned outgoing slide */
    overflow: hidden; /* clips the weeks scrolling in/out vertically */
  }
  .tl-vslide {
    width: 100%;
  }

  .tl-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 6px 16px 12px;
  }
  .nav-arrow {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    transition: background var(--fast) var(--ease), color var(--fast) var(--ease);
  }
  .nav-arrow:hover {
    background: var(--surface-hover);
    color: var(--text);
  }
  .nav-range {
    min-width: 116px;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    transition: background var(--fast) var(--ease), color var(--fast) var(--ease);
  }
  .nav-range:hover {
    background: var(--surface-hover);
    color: var(--text);
  }
  .nav-range.dim {
    color: var(--text-faint);
  }
</style>
