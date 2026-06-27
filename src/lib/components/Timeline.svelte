<script>
  import Icon from './Icon.svelte'
  import CalendarView from './CalendarView.svelte'
  import GanttView from './GanttView.svelte'
  import { board } from '../store.svelte.js'
  import { ui, setTimelineView } from '../ui.svelte.js'
  import { t } from '../i18n.svelte.js'

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
</script>

<section class="timeline">
  <header class="tl-head">
    <div class="tl-title">
      <Icon name="calendar" size={16} />
      <h2>{t('schedule')}</h2>
      <span class="tl-sub">{ui.timelineView === 'calendar' ? t('next4w') : t('next2w')}</span>
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
      <CalendarView items={dated} />
    {:else}
      <GanttView projects={board.projects} />
    {/if}
  </div>
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
  }
</style>
