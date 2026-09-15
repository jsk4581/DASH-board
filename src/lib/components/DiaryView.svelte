<script>
  // The Diary: three standing pages (my future, inner motivation, identity)
  // and three pages per day (gratitude, right after waking, today's
  // feedback) under a date strip, then the board's calendar. Every page is a
  // free-text card with the project card's chrome.
  import Icon from './Icon.svelte'
  import Timeline from './Timeline.svelte'
  import { library, setDiaryText, setDiaryDay, DIARY_STANDING, DIARY_DAILY, PALETTE } from '../store.svelte.js'
  import { todayISO, addDays, fromISODate, toISODate, formatLabel } from '../date.js'
  import { t } from '../i18n.svelte.js'

  const LABEL = { future: 'diaryFuture', motivation: 'diaryMotivation', identity: 'diaryIdentity', gratitude: 'diaryGratitude', morning: 'diaryMorning', feedback: 'diaryFeedback' }
  const PH = { future: 'diaryPhFuture', motivation: 'diaryPhMotivation', identity: 'diaryPhIdentity', gratitude: 'diaryPhGratitude', morning: 'diaryPhMorning', feedback: 'diaryPhFeedback' }
  const COLOR = { future: PALETTE[0], motivation: PALETTE[2], identity: PALETTE[3], gratitude: PALETTE[5], morning: PALETTE[1], feedback: PALETTE[4] }

  // the day the daily pages show; opens on today
  let date = $state(todayISO())
  const isToday = $derived(date === todayISO())
  const day = $derived(library.diary.days[date] ?? null)
  const dayText = (k) => day?.[k] ?? ''
  // days that have something written, for the strip's marks
  const written = $derived(new Set(Object.keys(library.diary.days)))
  // "yesterday" / "3 days ago" / "tomorrow": the day relative to today
  const relative = $derived.by(() => {
    const n = Math.round((fromISODate(date) - fromISODate(todayISO())) / 86400000)
    if (n === -1) return t('diaryYesterday')
    if (n === 1) return t('diaryTomorrow')
    return n < 0 ? t('diaryDaysAgo', { n: -n }) : t('diaryDaysAhead', { n })
  })

  function step(n) {
    date = toISODate(addDays(fromISODate(date), n))
  }

  // a textarea that grows with its text
  function autogrow(el) {
    const fit = () => {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
    fit()
    el.addEventListener('input', fit)
    return {
      update: fit,
      destroy: () => el.removeEventListener('input', fit),
    }
  }
</script>

<section class="diary">
  <div class="grid">
    {#each DIARY_STANDING as k (k)}
      <article class="card" style="--card-accent: {COLOR[k]};">
        <header class="card-head">
          <span class="color-dot"></span>
          <h2 class="title">{t(LABEL[k])}</h2>
        </header>
        <textarea
          class="page"
          rows="3"
          placeholder={t(PH[k])}
          value={library.diary[k]}
          oninput={(e) => setDiaryText(k, e.target.value)}
          use:autogrow={library.diary[k]}
        ></textarea>
      </article>
    {/each}
  </div>

  <!-- the date strip: the day the three daily pages belong to -->
  <div class="strip">
    <button class="icon-btn" onclick={() => step(-1)} title={t('diaryPrevDay')} aria-label={t('diaryPrevDay')}>
      <Icon name="chevronLeft" size={18} />
    </button>
    <div class="when">
      <span class="date">{formatLabel(date)}</span>
      {#if isToday}<span class="tag today">{t('diaryToday')}</span>{:else}<span class="tag">{relative}</span>{/if}
      {#if written.has(date)}<span class="pip" title={t('diaryWritten')}></span>{/if}
    </div>
    <button class="icon-btn" onclick={() => step(1)} title={t('diaryNextDay')} aria-label={t('diaryNextDay')}>
      <Icon name="chevron" size={18} />
    </button>
    {#if !isToday}
      <button class="reset" onclick={() => (date = todayISO())}>{t('diaryToday')}</button>
    {/if}
  </div>

  <div class="grid">
    {#each DIARY_DAILY as k (k)}
      <article class="card" style="--card-accent: {COLOR[k]};">
        <header class="card-head">
          <span class="color-dot"></span>
          <h2 class="title">{t(LABEL[k])}</h2>
        </header>
        {#key date}
          <textarea
            class="page"
            rows="3"
            placeholder={t(PH[k])}
            value={dayText(k)}
            oninput={(e) => setDiaryDay(date, k, e.target.value)}
            use:autogrow={dayText(k)}
          ></textarea>
        {/key}
      </article>
    {/each}
  </div>
</section>

<Timeline />

<style>
  .diary {
    padding: 18px clamp(14px, 3vw, 32px) 8px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 14px;
    align-items: start;
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: box-shadow var(--med) var(--ease);
  }
  .card:hover,
  .card:focus-within {
    box-shadow: var(--shadow-md);
  }
  .card-head {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 11px 10px 9px 13px;
    border-bottom: 1px solid var(--border);
    position: relative;
  }
  .card-head::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--card-accent);
  }
  .color-dot {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: var(--card-accent);
    flex: none;
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

  .page {
    display: block;
    width: 100%;
    min-height: 92px;
    padding: 10px 13px 12px;
    border: none;
    outline: none;
    background: transparent;
    resize: none;
    overflow: hidden;
    color: var(--text);
    font: inherit;
    font-size: 14.5px;
    line-height: 1.55;
  }
  .page::placeholder {
    color: var(--text-faint);
  }

  .strip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 0 0;
  }
  .when {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .date {
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .tag {
    font-size: 11.5px;
    font-weight: 700;
    color: var(--text-faint);
    padding: 2px 7px;
    border-radius: 99px;
    background: var(--surface-hover);
  }
  .tag.today {
    color: var(--accent-ink);
    background: var(--accent-soft);
  }
  .pip {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    flex: none;
  }
  .reset {
    margin-left: 4px;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-muted);
    padding: 4px 9px;
    border-radius: var(--radius-sm);
    transition: background var(--fast) var(--ease), color var(--fast) var(--ease);
  }
  .reset:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  @media (max-width: 560px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
