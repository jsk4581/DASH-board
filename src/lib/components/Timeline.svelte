<script>
  import { tick } from 'svelte'
  import { vslide } from '../pop.js'
  import Icon from './Icon.svelte'
  import CalendarView from './CalendarView.svelte'
  import DayAgenda from './DayAgenda.svelte'
  import GanttView from './GanttView.svelte'
  import { board } from '../store.svelte.js'
  import { ui, setTimelineView } from '../ui.svelte.js'
  import { t } from '../i18n.svelte.js'
  import { viewport } from '../media.svelte.js'
  import { addDays, addMonths, toISODate, todayISO, formatShort, monthTitle } from '../date.js'

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

  // date navigation: the calendar pages by whole months (arrows); the gantt's
  // 2-week window slides a day at a time from a range slider. Each keeps its
  // own offset so toggling views doesn't land on an unrelated date.
  const SLIDER_DAYS = 84 // the slider reaches 12 weeks either way
  let offsetDays = $state(0) // gantt: first day of the window, relative to today
  let monthOffset = $state(0) // calendar
  let dir = $state(1) // slide direction: +1 forward (next), -1 backward (prev)
  // true ONLY during the render caused by a date step, so it animates then. Stays
  // false on first paint and on a view toggle (calendar/gantt), so neither slides.
  let paging = $state(false)
  const isCal = $derived(ui.timelineView === 'calendar')
  const atStart = $derived(isCal ? monthOffset === 0 : offsetDays === 0)

  function step(by) {
    dir = by > 0 ? 1 : -1
    paging = true
    monthOffset += by
    picked = null
    tick().then(() => (paging = false))
  }
  function reset() {
    if (atStart) return
    if (isCal) step(-monthOffset)
    else offsetDays = 0
  }
  const from = $derived(addDays(new Date(), offsetDays))
  const month = $derived(addMonths(new Date(), monthOffset))
  const rangeLabel = $derived(
    isCal
      ? monthTitle(month)
      : `${formatShort(toISODate(from))} – ${formatShort(toISODate(addDays(from, 13)))}`
  )
  const subtitle = $derived(atStart ? (isCal ? t('thisMonth') : t('next2w')) : rangeLabel)

  // phone calendar: the tapped day whose items are listed under the grid.
  // Defaults to today when the shown month contains it, else the 1st.
  let picked = $state(null)
  const selected = $derived(picked ?? (monthOffset === 0 ? todayISO() : toISODate(month)))
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
        {#key monthOffset}
          <div
            class="tl-vslide"
            in:vslide={{ dir, mode: 'in', nav: paging, weeks: 4 }}
            out:vslide={{ dir, mode: 'out', nav: paging, weeks: 4 }}
          >
            <CalendarView items={dated} {month} {selected} onselect={(iso) => (picked = iso)} />
          </div>
        {/key}
      </div>
      {#if viewport.narrow}
        <DayAgenda items={dated} day={selected} />
      {/if}
    {:else}
      <!-- gantt keeps its left label column and slides only the date tracks (internally) -->
      <GanttView projects={board.projects} {from} />
    {/if}
  </div>

  {#if isCal}
    <nav class="tl-nav" aria-label={t('schedule')}>
      <button class="nav-arrow" onclick={() => step(-1)} aria-label={t('prevPeriod')} title={t('prevPeriod')}>
        <Icon name="chevronLeft" size={18} />
      </button>
      <button class="nav-range" class:dim={atStart} onclick={reset} title={t('backToToday')}>
        {rangeLabel}
      </button>
      <button class="nav-arrow" onclick={() => step(1)} aria-label={t('nextPeriod')} title={t('nextPeriod')}>
        <Icon name="chevron" size={18} />
      </button>
    </nav>
  {:else}
    <nav class="tl-nav slider-nav" aria-label={t('schedule')}>
      <button class="nav-range" class:dim={atStart} onclick={reset} title={t('backToToday')}>
        {rangeLabel}
      </button>
      <!-- the centre of the slider is today; a tick marks it -->
      <div class="slider">
        <input
          type="range"
          min={-SLIDER_DAYS}
          max={SLIDER_DAYS}
          step="1"
          bind:value={offsetDays}
          aria-label={t('ganttSlider')}
          aria-valuetext={rangeLabel}
        />
      </div>
    </nav>
  {/if}
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

  .slider-nav {
    gap: 14px;
    padding: 8px 20px 14px;
  }
  .slider {
    position: relative;
    flex: 1;
    max-width: 520px;
    display: flex;
    align-items: center;
    height: 30px;
  }
  /* today tick under the middle of the track */
  .slider::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 2px;
    height: 10px;
    margin-left: -1px;
    transform: translateY(-50%);
    background: var(--highlight);
    border-radius: 1px;
    pointer-events: none;
  }
  .slider input {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 30px;
    margin: 0;
    background: transparent;
    cursor: pointer;
    touch-action: pan-y;
  }
  .slider input:focus-visible {
    outline: none;
  }
  .slider input::-webkit-slider-runnable-track {
    height: 4px;
    border-radius: 2px;
    background: var(--border-strong);
  }
  .slider input::-moz-range-track {
    height: 4px;
    border-radius: 2px;
    background: var(--border-strong);
  }
  .slider input::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    margin-top: -7px;
    border-radius: 50%;
    background: var(--surface);
    border: 2px solid var(--accent-ink);
    box-shadow: var(--shadow-sm);
    transition: transform var(--fast) var(--ease);
  }
  .slider input::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--surface);
    border: 2px solid var(--accent-ink);
    box-shadow: var(--shadow-sm);
  }
  .slider input:active::-webkit-slider-thumb,
  .slider input:focus-visible::-webkit-slider-thumb {
    transform: scale(1.15);
    background: var(--accent-soft);
  }

  /* phones: reclaim horizontal space so the 7-day calendar has room to fit */
  @media (max-width: 560px) {
    .timeline {
      margin: 12px 8px 24px;
    }
    .tl-head {
      padding: 10px 10px;
    }
    .tl-body {
      padding: 10px 8px 8px;
    }
  }
</style>
