<script>
  import { dragHandle } from 'svelte-dnd-action'
  import Icon from './Icon.svelte'
  import DatePopover from './DatePopover.svelte'
  import { updateItemText, toggleStatus, removeItem } from '../store.svelte.js'
  import { touchItem } from '../ui.svelte.js'
  import { relativeTag, formatLabel, formatShort } from '../date.js'
  import { t } from '../i18n.svelte.js'

  let { pid, item, editing = true, autofocus = false, onenter } = $props()

  let inputEl = $state(null)
  let dateBtn = $state(null)
  let showDate = $state(false)

  // measured text box → drives the 강조 circle size so it wraps (not covers) the words
  let textW = $state(0)
  let textH = $state(0)
  // base padding for a single line; grows with extra lines so the loop encloses
  // multi-line text instead of cutting through it (an ellipse around a tall box
  // needs to be much wider/taller than the box to contain its corners)
  const ONE_LINE_H = 11 // ~ half the 15px·1.4 line box
  const OY_MAX = 13 // cap vertical bleed into the rows above/below
  function grade(w, h) {
    // A wrapped item keeps the SAME horizontal padding as a single line, so the
    // loop is never wider than the one-line case and can't cover the checkbox
    // (left) or the due-date stamp (right). Only the height grows to wrap the
    // extra lines; the extreme corners may poke out a touch, which reads as a
    // hand-drawn circle.
    const extra = Math.max(0, h / 2 - ONE_LINE_H)
    const ox = 11
    const oy = Math.min(OY_MAX, 7 + extra * 0.45)
    return { ox, oy, w: w + ox * 2, h: h + oy * 2 }
  }

  $effect(() => {
    if (autofocus && inputEl) {
      inputEl.focus()
    }
  })

  function onKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      inputEl?.blur()
      onenter?.()
    } else if (e.key === 'Escape') {
      inputEl?.blur()
    }
  }

  function onBlur() {
    // drop an item that was never given any text
    if (!item.text.trim()) removeItem(pid, item.id)
  }

  const overdue = $derived(item.due && relativeTag(item.due).startsWith('D+'))
</script>

<div
  class="item"
  class:done={item.status === 'done'}
  class:highlight={item.status === 'highlight'}
  class:revealed={touchItem.id === item.id}
  data-item-id={item.id}
>
  {#if editing}
    <span class="grip" use:dragHandle title={t('dragMove')} aria-label={t('itemGrip')}>
      <Icon name="grip" size={16} />
    </span>
  {/if}

  <button
    class="dot icon-btn"
    title={item.status === 'done' ? t('markUndone') : t('markDone')}
    aria-label={t('toggleDone')}
    onclick={() => toggleStatus(pid, item.id, 'done')}
    disabled={!editing}
  >
    <span class="checkbox">
      {#if item.status === 'done'}<Icon name="check" size={13} strokeWidth={3} />{/if}
    </span>
  </button>

  <div class="body" class:editing class:has-due={!!item.due}>
    <div class="text-wrap" bind:clientWidth={textW} bind:clientHeight={textH}>
      {#if editing}
        <!-- invisible mirror sizes the box to the text (incl. wrapping & bold),
             so the box — and the grading circle — hugs the words instead of
             filling the whole column. The textarea overlays it. -->
        <span class="sizer" aria-hidden="true">{item.text ? item.text + '​' : t('taskPlaceholder')}</span>
        <textarea
          class="text-input"
          bind:this={inputEl}
          rows="1"
          placeholder={t('taskPlaceholder')}
          value={item.text}
          oninput={(e) => updateItemText(pid, item.id, e.target.value)}
          onkeydown={onKeydown}
          onblur={onBlur}
        ></textarea>
      {:else}
        <span class="text">{item.text || ' '}</span>
      {/if}

      {#if item.status === 'highlight' && item.text.trim() && textW > 0}
        {@const g = grade(textW, textH)}
        <svg
          class="grade"
          style="left:{-g.ox}px; top:{-g.oy}px; width:{g.w}px; height:{g.h}px;"
          viewBox="0 0 {g.w} {g.h}"
          aria-hidden="true"
        >
          <ellipse
            cx={g.w / 2}
            cy={g.h / 2}
            rx={g.w / 2 - 2}
            ry={g.h / 2 - 2}
            filter="url(#pencil-rough)"
          />
        </svg>
      {/if}
    </div>
  </div>

  {#if item.due}
    <button
      class="due-stamp"
      class:overdue
      title={formatLabel(item.due)}
      onclick={() => editing && (showDate = true)}
      disabled={!editing}
    >
      <Icon name="calendar" size={10} />
      {formatShort(item.due)}
    </button>
  {/if}

  {#if editing}
    <div class="actions">
      <button
        class="icon-btn"
        class:active={item.status === 'highlight'}
        data-act="highlight"
        title={t('highlight')}
        aria-label={t('toggleHighlight')}
        onclick={() => toggleStatus(pid, item.id, 'highlight')}
      >
        <Icon name="star" size={13} fill={item.status === 'highlight'} />
      </button>
      <button
        class="icon-btn"
        class:active={!!item.due}
        data-act="due"
        title={t('due')}
        aria-label={t('setDue')}
        bind:this={dateBtn}
        onclick={() => (showDate = !showDate)}
      >
        <Icon name="calendar" size={13} />
      </button>
      <button
        class="icon-btn danger"
        title={t('delete')}
        aria-label={t('deleteItem')}
        onclick={() => removeItem(pid, item.id)}
      >
        <Icon name="trash" size={13} />
      </button>
    </div>
  {/if}
</div>

{#if showDate}
  <DatePopover {pid} {item} anchor={dateBtn} onclose={() => (showDate = false)} />
{/if}

<style>
  .item {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 4px 4px 4px 2px;
    border-radius: var(--radius-sm);
    transition: background var(--fast) var(--ease);
  }
  .item:hover {
    background: var(--surface-2);
  }

  /* 강조: hand-drawn red colored-pencil circle, like grading on paper */
  .grade {
    position: absolute;
    pointer-events: none;
    overflow: visible;
    z-index: 2;
  }
  .grade ellipse {
    fill: none;
    stroke: var(--pencil);
    stroke-width: 2;
    opacity: 0.9;
  }

  .grip {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    margin: 2px -2px 0 -4px;
    color: var(--text-faint);
    cursor: grab;
    opacity: 0;
    transition: opacity var(--fast) var(--ease);
    touch-action: none;
  }
  .grip:active {
    cursor: grabbing;
  }
  .item:hover .grip {
    opacity: 1;
  }
  @media (hover: none) {
    .grip {
      opacity: 1;
    }
  }

  .dot {
    margin-top: 1px;
    width: 22px;
    height: 22px;
  }
  .checkbox {
    width: 16px;
    height: 16px;
    border-radius: 5px;
    border: 1.6px solid var(--border-strong);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-ink);
    transition: background var(--fast) var(--ease), border-color var(--fast) var(--ease);
  }
  .dot:hover .checkbox {
    border-color: var(--accent);
  }
  .item.done .checkbox {
    background: var(--accent);
    border-color: var(--accent);
  }

  .body {
    position: relative;
    flex: 1;
    min-width: 0;
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 4px 8px;
    padding-top: 2px;
  }
  /* keep the text clear of the lower-right date stamp / hover actions */
  .body.has-due {
    padding-right: 46px;
  }

  /* shrinks to the text in BOTH view and edit modes so the 강조 circle
     hugs the words (never the whole column) */
  .text-wrap {
    position: relative;
    flex: 0 1 auto;
    min-width: 0;
    max-width: 100%;
    display: block;
  }
  .text,
  .sizer {
    display: block;
    min-width: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.4;
  }
  /* the mirror only sizes the box; the textarea overlays it */
  .sizer {
    visibility: hidden;
  }
  .text-input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    background: transparent;
    resize: none;
    padding: 0;
    line-height: 1.4;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    overflow: hidden;
    font: inherit;
  }
  .text-input::placeholder {
    color: var(--text-faint);
  }

  /* states */
  .item.done .text,
  .item.done .text-input {
    text-decoration: line-through;
    color: var(--done);
    text-decoration-thickness: 1.5px;
  }
  .item.highlight .text,
  .item.highlight .text-input,
  .item.highlight .sizer {
    font-weight: 700;
    /* 강조는 글자색을 바꾸지 않고 볼드 + 빨간 동그라미로만 표시 */
  }

  /* compact date stamp tucked into the item's lower-right corner.
     same font/colour family as before, ~half the footprint. */
  .due-stamp {
    position: absolute;
    right: 6px;
    /* line up with the centre of the item name's first line */
    top: 16px;
    transform: translateY(-50%);
    /* above the grading circle (z-index:2) so the opaque pill clips any arc that
       bleeds into the date corner on a wrapped highlighted item */
    z-index: 3;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    background: var(--surface-hover);
    border-radius: 99px;
    padding: 1px 6px 1px 5px;
    line-height: 1.3;
    white-space: nowrap;
    transition: background var(--fast) var(--ease);
  }
  .due-stamp:hover:not(:disabled) {
    background: var(--border);
  }
  .due-stamp.overdue {
    color: #d92d2d;
    background: #fdeaea;
  }
  :root[data-theme='dark'] .due-stamp.overdue {
    background: #3a1c1c;
    color: #ff8080;
  }

  /* floating overlay pill — centred on the item name's first line so on hover
     it covers the date stamp instead of stealing width */
  .actions {
    position: absolute;
    top: 16px;
    right: 4px;
    z-index: 6;
    display: flex;
    align-items: center;
    gap: 1px;
    padding: 1px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-md);
    opacity: 0;
    transform: translateY(calc(-50% + 2px)) scale(0.96);
    transform-origin: center right;
    transition: opacity var(--fast) var(--ease), transform var(--fast) var(--ease);
    pointer-events: none;
  }
  .actions .icon-btn {
    width: 22px;
    height: 22px;
  }
  .item:hover .actions,
  .item:focus-within .actions {
    opacity: 1;
    transform: translateY(-50%);
    pointer-events: auto;
  }
  .actions .icon-btn.active[data-act='highlight'] {
    color: var(--pencil);
  }
  .actions .icon-btn.active[data-act='due'] {
    color: var(--accent);
  }

  /* touch: don't force the action pill on permanently (it covered the date
     stamp and floated over the text). Reveal only the tapped item's pill. */
  @media (hover: none) {
    .item.revealed .actions {
      opacity: 1;
      transform: translateY(-50%);
      pointer-events: auto;
    }
  }
</style>
