<script>
  // The Diary: one sheet per day (gratitude, right
  // after waking, today's feedback), today first and the earlier days lined
  // up beside it on a wide screen, one at a time on a phone. The three
  // standing pages (my future, inner motivation, identity) sit above in
  // three columns. Every sheet has the project card's chrome. The board's
  // calendar follows underneath.
  import Icon from './Icon.svelte'
  import Timeline from './Timeline.svelte'
  import { library, setDiaryText, setDiaryDay, DIARY_STANDING, DIARY_DAILY } from '../store.svelte.js'
  import { todayISO, addDays, fromISODate, toISODate, formatLabel, weekdayLabel } from '../date.js'
  import { t } from '../i18n.svelte.js'

  const LABEL = { future: 'diaryFuture', motivation: 'diaryMotivation', identity: 'diaryIdentity', gratitude: 'diaryGratitude', morning: 'diaryMorning', feedback: 'diaryFeedback' }
  const PH = { future: 'diaryPhFuture', motivation: 'diaryPhMotivation', identity: 'diaryPhIdentity', gratitude: 'diaryPhGratitude', morning: 'diaryPhMorning', feedback: 'diaryPhFeedback' }

  const SPAN = 14 // days per "further back" step
  let span = $state(SPAN)
  const today = $derived(todayISO())
  // today and the days before it, then any older day that has writing
  const dates = $derived.by(() => {
    const out = []
    const t0 = fromISODate(today)
    for (let i = 0; i < span; i++) out.push(toISODate(addDays(t0, -i)))
    const seen = new Set(out)
    const older = Object.keys(library.diary.days)
      .filter((d) => !seen.has(d) && d < today)
      .sort()
      .reverse()
    return [...out, ...older]
  })
  const dayText = (date, k) => library.diary.days[date]?.[k] ?? ''
  const hasText = (date) => DIARY_DAILY.some((k) => dayText(date, k))
  // "yesterday" / "3 days ago" under the date
  function ago(date) {
    const n = Math.round((fromISODate(today) - fromISODate(date)) / 86400000)
    if (n === 0) return t('diaryToday')
    if (n === 1) return t('diaryYesterday')
    return t('diaryDaysAgo', { n })
  }
  // the day and month as the sheet's heading ("9월 15일"), the weekday beside it
  function heading(date) {
    const d = fromISODate(date)
    return formatLabel(date).replace(/\s*\(.*\)$/, '')
  }
  const weekday = (date) => weekdayLabel(fromISODate(date).getDay())


  // the row of sheets: a "today" button once it is scrolled away
  let row = $state(null)
  let away = $state(false)
  function onScroll() {
    away = row ? row.scrollLeft > 24 : false
  }
  function toToday() {
    row?.scrollTo({ left: 0, behavior: 'smooth' })
  }

  // a textarea that grows with its text
  function autogrow(el) {
    const fit = () => {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
    // the value lands after the action runs: measure again on the next frame
    const soon = () => {
      fit()
      requestAnimationFrame(fit)
    }
    soon()
    el.addEventListener('input', fit)
    return { update: soon, destroy: () => el.removeEventListener('input', fit) }
  }
</script>

<section class="diary">
  <!-- the standing pages: three columns above the days -->
  <div class="creed">
    {#each DIARY_STANDING as k (k)}
      <div class="creed-page">
        <h3 class="sec">{t(LABEL[k])}</h3>
        <textarea
          class="lines"
          rows="1"
          placeholder={t(PH[k])}
          value={library.diary[k]}
          oninput={(e) => setDiaryText(k, e.target.value)}
          use:autogrow={library.diary[k]}
        ></textarea>
      </div>
    {/each}
  </div>

  <!-- the days: today first, earlier days beside it -->
  <div class="row-head">
    <h2 class="row-title">{t('diaryDays')}</h2>
    {#if away}
      <button class="today-btn" onclick={toToday}><Icon name="chevronLeft" size={14} /> {t('diaryBackToday')}</button>
    {/if}
  </div>
  <div class="sheets" bind:this={row} onscroll={onScroll}>
    {#each dates as date (date)}
      <article class="sheet" class:today={date === today} class:written={hasText(date)}>
        <header class="card-head">
          <h2 class="title">{heading(date)}</h2>
          <span class="meta">{weekday(date)} · {ago(date)}</span>
        </header>
        <div class="pages">
        {#each DIARY_DAILY as k (k)}
          <h3 class="sec">{t(LABEL[k])}</h3>
          <textarea
            class="lines"
            rows="2"
            placeholder={date === today ? t(PH[k]) : ''}
            value={dayText(date, k)}
            oninput={(e) => setDiaryDay(date, k, e.target.value)}
            use:autogrow={dayText(date, k)}
          ></textarea>
        {/each}
        </div>
      </article>
    {/each}
    <button class="sheet more" onclick={() => (span += SPAN)}>
      <Icon name="chevronLeft" size={16} />
      <span>{t('diaryMore')}</span>
    </button>
  </div>
</section>

<Timeline />

<style>
  .diary {
    padding: 18px clamp(14px, 3vw, 32px) 8px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* the card chrome, as on the board */
  .creed,
  .sheet {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    transition: box-shadow var(--med) var(--ease), border-color var(--med) var(--ease);
  }
  .sheet:hover,
  .sheet:focus-within {
    box-shadow: var(--shadow-md);
  }
  .card-head {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 11px 13px 9px;
    border-bottom: 1px solid var(--border);
  }
  .title {
    flex: 1;
    min-width: 0;
    font-size: 15px;
    font-weight: 650;
    margin: 0;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .meta {
    flex: none;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }
  .sheet.today {
    border-color: var(--accent);
  }
  .sheet.today .meta {
    color: var(--accent-ink);
  }
  .sheet:not(.today):not(.written):not(:focus-within) {
    opacity: 0.8;
  }

  /* ---- the standing pages ---- */
  .creed {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }
  .creed-page {
    padding: 6px 13px 7px;
  }
  .creed-page + .creed-page {
    border-left: 1px solid var(--border);
  }

  /* ---- the sheets ---- */
  .row-head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 2px 0;
    min-height: 30px;
  }
  .row-title {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
  }
  .today-btn {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--accent-ink);
    padding: 4px 9px 4px 6px;
    border-radius: var(--radius-sm);
    background: var(--accent-soft);
  }
  .sheets {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x proximity;
    padding: 2px 2px 14px;
    margin: 0 -2px;
  }
  .sheet {
    flex: none;
    width: 320px;
    scroll-snap-align: start;
  }
  .pages {
    padding: 8px 13px 12px;
  }

  /* a page: its label, then the text */
  .sec {
    margin: 8px 0 2px;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-muted);
  }
  .creed-page .sec {
    margin: 0 0 1px;
    font-size: 12px;
  }
  .lines {
    display: block;
    width: 100%;
    min-height: calc(1.5em * 2 + 8px);
    padding: 3px 6px;
    margin: 0 -6px;
    width: calc(100% + 12px);
    border: none;
    outline: none;
    background: transparent;
    border-radius: var(--radius-xs);
    resize: none;
    overflow: hidden;
    color: var(--text);
    font: inherit;
    font-size: 14px;
    line-height: 1.5;
    transition: background var(--fast) var(--ease);
  }
  .lines:focus {
    background: var(--surface-hover);
  }
  .creed-page .lines {
    min-height: calc(1.45em + 6px);
    font-size: 13px;
    line-height: 1.45;
    padding: 3px 6px 4px;
  }
  .lines::placeholder {
    color: var(--text-faint);
  }

  .sheet.more {
    width: 110px;
    align-self: stretch;
    min-height: 180px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1.5px dashed var(--border-strong);
    background: transparent;
    box-shadow: none;
    color: var(--text-muted);
    font-size: 12.5px;
    font-weight: 550;
    text-align: center;
    transition: color var(--fast) var(--ease), border-color var(--fast) var(--ease), background var(--fast) var(--ease);
  }
  .sheet.more:hover {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  @media (max-width: 720px) {
    .creed {
      grid-template-columns: 1fr;
    }
    .creed-page + .creed-page {
      border-left: none;
      border-top: 1px solid var(--border);
    }
    .creed-page {
      padding: 5px 13px 6px;
    }
    /* one sheet at a time, swiped */
    .sheets {
      scroll-snap-type: x mandatory;
      gap: 10px;
    }
    .sheet {
      width: calc(100% - 4px);
    }
    .sheet.more {
      width: 96px;
    }
  }
</style>
