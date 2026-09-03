<script>
  import { formatLabel } from '../date.js'
  import { t } from '../i18n.svelte.js'

  // the selected day's items, listed in full below the phone calendar grid
  let { items, day } = $props()

  const list = $derived(
    items.filter((it) => {
      const lo = it.start && it.start < it.due ? it.start : it.due
      return day >= lo && day <= it.due
    })
  )
</script>

<section class="agenda" aria-label={formatLabel(day)}>
  <h3>{formatLabel(day)}</h3>
  {#if list.length === 0}
    <p class="empty">{t('noItemsDay')}</p>
  {:else}
    <ul>
      {#each list as it (it.id)}
        <li class:done={it.status === 'done'} class:highlight={it.status === 'highlight'} style="--c: {it.projectColor};">
          <span class="dot"></span>
          <span class="project">{it.projectTitle}</span>
          <span class="text">{it.text}</span>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .agenda {
    margin-top: 8px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
  }
  h3 {
    margin: 0 0 6px;
    font-size: 12.5px;
    font-weight: 700;
    color: var(--text-muted);
  }
  .empty {
    margin: 0;
    padding: 6px 0 4px;
    font-size: 13px;
    color: var(--text-faint);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  li {
    display: grid;
    grid-template-columns: auto minmax(0, 32%) minmax(0, 1fr);
    align-items: center;
    column-gap: 8px;
    padding: 6px 8px;
    border-radius: var(--radius-xs);
    background: var(--surface-2);
    border: 1px solid var(--border);
    font-size: 13px;
    line-height: 1.35;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--c);
  }
  .project {
    font-size: 11.5px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .text {
    color: var(--text);
    min-width: 0;
    overflow-wrap: anywhere;
  }
  li.done .dot {
    background: transparent;
    box-shadow: inset 0 0 0 1.5px var(--c);
    opacity: 0.6;
  }
  li.done .text {
    text-decoration: line-through;
    color: var(--done);
  }
  li.highlight {
    border-color: var(--pencil);
    box-shadow: inset 2px 0 0 var(--pencil);
  }
  li.highlight .text {
    font-weight: 700;
  }
</style>
