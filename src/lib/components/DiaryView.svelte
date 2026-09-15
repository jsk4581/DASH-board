<script>
  // The Diary as a stack of paper: one ruled sheet per day (gratitude, right
  // after waking, today's feedback), today first and the earlier days lined
  // up beside it on a wide screen, one at a time on a phone. The three
  // standing pages (my future, inner motivation, identity) sit above in a
  // folded band that opens into the same ruled paper. The board's calendar
  // follows underneath.
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

  // the standing pages open by themselves until one of them has text (a
  // preference once toggled; before that it follows the data, which may
  // still be arriving from sync when the view mounts)
  let openPref = $state(null)
  const open = $derived(openPref ?? !DIARY_STANDING.some((k) => library.diary[k]))
  const standingSummary = (k) => (library.diary[k] || '').split('\n').find((l) => l.trim()) ?? ''

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
    fit()
    el.addEventListener('input', fit)
    return { update: fit, destroy: () => el.removeEventListener('input', fit) }
  }
</script>

<section class="diary">
  <!-- the standing pages: a folded band, or three columns of paper -->
  <div class="creed" class:open>
    <button class="fold" onclick={() => (openPref = !open)} aria-expanded={open}>
      {#if open}
        <span class="fold-title">{t('diaryCreed')}</span>
      {:else}
        {#each DIARY_STANDING as k (k)}
          <span class="sum">
            <span class="sum-k">{t(LABEL[k])}</span>
            <span class="sum-v" class:ph={!standingSummary(k)}>{standingSummary(k) || t('diaryEmptyPage')}</span>
          </span>
        {/each}
      {/if}
      <span class="fold-act">{open ? t('diaryCollapse') : t('diaryExpand')} <Icon name="chevron" size={14} /></span>
    </button>
    {#if open}
      <div class="creed-pages">
        {#each DIARY_STANDING as k (k)}
          <div class="creed-page">
            <h3 class="sec">{t(LABEL[k])}</h3>
            <textarea
              class="lines"
              rows="3"
              placeholder={t(PH[k])}
              value={library.diary[k]}
              oninput={(e) => setDiaryText(k, e.target.value)}
              use:autogrow={library.diary[k]}
            ></textarea>
          </div>
        {/each}
      </div>
    {/if}
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
        <header class="day">
          <span class="d">{heading(date)}</span>
          <span class="w">{weekday(date)} · {ago(date)}</span>
        </header>
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
    --paper: var(--surface);
    --serif: 'Noto Serif KR', 'Apple Myungjo', 'Nanum Myeongjo', 'Batang', Georgia, serif;
    --lh: 1.9;
    padding: 18px clamp(14px, 3vw, 32px) 8px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* ---- the standing pages ---- */
  .creed {
    background: var(--paper);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }
  .fold {
    display: flex;
    align-items: center;
    gap: 18px;
    width: 100%;
    padding: 11px 14px 11px 18px;
    text-align: left;
    color: var(--text);
    transition: background var(--fast) var(--ease);
  }
  .fold:hover {
    background: var(--surface-hover);
  }
  .creed.open .fold {
    border-bottom: 1px solid var(--border);
  }
  .fold-title {
    flex: 1;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: var(--text-muted);
  }
  .sum {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 13.5px;
  }
  .sum-k {
    flex: none;
    font-weight: 700;
    color: var(--text-muted);
    font-size: 12.5px;
  }
  .sum-v {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: var(--serif);
    color: var(--text);
  }
  .sum-v.ph {
    color: var(--text-faint);
    font-family: inherit;
  }
  .fold-act {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--accent-ink);
  }
  .fold-act :global(svg) {
    transform: rotate(90deg);
    transition: transform var(--fast) var(--ease);
  }
  .creed.open .fold-act :global(svg) {
    transform: rotate(-90deg);
  }
  .creed-pages {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
  }
  .creed-page {
    padding: 14px 22px 18px;
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
    font-weight: 700;
    letter-spacing: 0.02em;
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
    width: 360px;
    scroll-snap-align: start;
    background: var(--paper);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
    padding: 20px 24px 22px;
    transition: box-shadow var(--med) var(--ease), border-color var(--med) var(--ease);
  }
  .sheet:hover,
  .sheet:focus-within {
    box-shadow: var(--shadow-md);
  }
  .sheet.today {
    border-color: var(--accent);
  }
  .sheet:not(.today):not(.written):not(:focus-within) {
    opacity: 0.78;
  }
  .day {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 8px;
  }
  .day .d {
    font-family: var(--serif);
    font-size: 21px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text);
  }
  .day .w {
    font-size: 12px;
    color: var(--text-faint);
  }
  .sheet.today .day .w {
    color: var(--accent-ink);
    font-weight: 600;
  }

  .sec {
    margin: 14px 0 0;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--accent-ink);
  }
  .creed-page .sec {
    margin-top: 0;
  }

  /* ruled paper: one line per row of text */
  .lines {
    display: block;
    width: 100%;
    min-height: calc(var(--lh) * 2em);
    padding: 0;
    border: none;
    outline: none;
    background: transparent;
    resize: none;
    overflow: hidden;
    color: var(--text);
    font: inherit;
    font-family: var(--serif);
    font-size: 14.5px;
    line-height: var(--lh);
    background-image: linear-gradient(to bottom, transparent calc(var(--lh) * 1em - 1px), var(--border) calc(var(--lh) * 1em - 1px));
    background-size: 100% calc(var(--lh) * 1em);
    background-attachment: local;
  }
  .creed-page .lines {
    min-height: calc(var(--lh) * 3em);
  }
  .lines::placeholder {
    color: var(--text-faint);
    font-family: inherit;
  }

  .sheet.more {
    width: 120px;
    align-self: stretch;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-style: dashed;
    border-color: var(--border-strong);
    background: transparent;
    box-shadow: none;
    color: var(--text-muted);
    font-size: 12.5px;
    font-weight: 600;
    text-align: center;
    transition: color var(--fast) var(--ease), border-color var(--fast) var(--ease);
  }
  .sheet.more:hover {
    color: var(--accent);
    border-color: var(--accent);
  }

  @media (max-width: 720px) {
    .creed-pages {
      grid-template-columns: 1fr;
    }
    .creed-page + .creed-page {
      border-left: none;
      border-top: 1px solid var(--border);
    }
    .fold {
      flex-direction: column;
      align-items: stretch;
      gap: 4px;
      padding: 10px 14px;
    }
    .fold-act {
      align-self: flex-end;
    }
    /* one sheet at a time, swiped */
    .sheets {
      scroll-snap-type: x mandatory;
      gap: 10px;
    }
    .sheet {
      width: calc(100% - 4px);
      padding: 16px 18px 18px;
    }
    .sheet.more {
      width: 96px;
    }
  }
</style>
