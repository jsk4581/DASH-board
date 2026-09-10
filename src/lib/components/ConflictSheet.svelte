<script>
  // Sync conflict: what differs between this device and the other side, what
  // merges on its own, and a pick per real conflict before applying.
  import { fade, fly } from 'svelte/transition'
  import Icon from './Icon.svelte'
  import { sync, conflictSnapshot, resolveConflict, keepLocal, keepRemote } from '../sync.svelte.js'
  import { diffBoards, DUMP } from '../merge.js'
  import { formatShort } from '../date.js'
  import { onBackButton } from '../platform.js'
  import { t } from '../i18n.svelte.js'

  const snap = conflictSnapshot()
  const diff = snap.remote ? diffBoards(snap.base, snap.local, snap.remote) : { auto: [], conflicts: [], noBase: false, merge: () => snap.local }
  const otherName = $derived(snap.remoteName || (sync.host ? t('mergeOther') : t('mergeCloud')))

  let choices = $state({})
  const left = $derived(diff.conflicts.filter((c) => !choices[c.key]).length)
  // order notes only exist once every conflict has a pick
  const orderNotes = $derived.by(() => {
    if (left) return []
    try {
      return diff.merge(choices).orderNotes
    } catch {
      return []
    }
  })
  let showAuto = $state(diff.auto.length <= 12)
  let busy = $state(false)

  $effect(() =>
    onBackButton(() => {
      close()
      return true
    })
  )
  function close() {
    sync.showMerge = false
  }
  function onKey(e) {
    if (e.key === 'Escape') close()
  }
  function pickAll(side) {
    for (const c of diff.conflicts) choices[c.key] = side
  }
  async function apply() {
    if (left || busy) return
    busy = true
    try {
      const doc = diff.merge(choices)
      delete doc.orderNotes
      await resolveConflict(doc)
    } finally {
      busy = false
      close()
    }
  }
  async function keepAll(side) {
    busy = true
    try {
      await (side === 'local' ? keepLocal() : keepRemote())
    } finally {
      busy = false
      close()
    }
  }

  // ---- display helpers ----
  const kindLabel = (k) => t(k === 'board' ? 'kindBoard' : k === 'project' ? 'kindProject' : 'kindItem')
  const fieldLabel = (f) => t('f' + f[0].toUpperCase() + f.slice(1))
  function val(f, v, entry) {
    if (f === 'status') return t(v === 'done' ? 'stDone' : v === 'highlight' ? 'stHighlight' : 'stDefault')
    if (f === 'start' || f === 'due') return v ? formatShort(v) : t('vNone')
    if (f === 'remind') return t(v ? 'vOn' : 'vOff')
    if (f === 'where') return t(v === 'archive' ? 'vArchive' : 'vItems')
    if (f === 'parent') return entry?.[`${entry._side}Name`] ?? ''
    if (f === 'color') return ''
    return v == null || v === '' ? t('vNone') : String(v)
  }
  const sideVal = (fld, side) => {
    if (fld.field === 'parent') {
      if (fld[side] === DUMP) return t('dumpTab')
      return side === 'local' ? fld.localName : side === 'remote' ? fld.remoteName : fld.baseName
    }
    return val(fld.field, fld[side])
  }
  // the Dump's items carry no board/project names: label them with the tab
  const fullPath = (e) => (e.dump ? [t('dumpTab'), ...e.path] : e.path)
  const typeLabel = (c) =>
    t(
      c.type === 'edit'
        ? 'mergeTypeEdit'
        : c.type === 'delete-local'
          ? 'mergeTypeDeleteLocal'
          : c.type === 'delete-remote'
            ? 'mergeTypeDeleteRemote'
            : c.type === 'only-local'
              ? 'mergeTypeOnlyLocal'
              : 'mergeTypeOnlyRemote'
    )
  // what picking a side means for a delete / one-side-only conflict
  function sideMeaning(c, side) {
    const has = side === 'local' ? c.local : c.remote
    return has ? t('mergeKeep') : t('mergeDelete')
  }
  const entityName = (c) => c.path[c.path.length - 1] || t('vNone')
</script>

<svelte:window onkeydown={onKey} />

<div class="backdrop" transition:fade={{ duration: 140 }} onclick={close} role="presentation"></div>
<div class="sheet" transition:fly={{ y: 24, duration: 200 }} role="dialog" aria-label={t('mergeTitle')}>
  <header>
    <Icon name="cloud" size={16} />
    <h2>{t('mergeTitle')}</h2>
    <button class="icon-btn" onclick={close} title={t('close')} aria-label={t('close')}><Icon name="x" size={16} /></button>
  </header>
  <p class="intro">{diff.noBase ? t('mergeNoBase') : t('mergeIntro')}</p>
  <div class="legend">
    <span class="chip local">{t('mergeThis')}</span>
    <span class="chip remote">{otherName}</span>
  </div>

  <div class="body">
    <section>
      <div class="sec-head">
        <h3>{t('mergeConflicts')} <span class="n">{diff.conflicts.length}</span></h3>
        {#if diff.conflicts.length > 1}
          <div class="mini">
            <button class="ghost xs" onclick={() => pickAll('local')}>{t('mergeAllThis')}</button>
            <button class="ghost xs" onclick={() => pickAll('remote')}>{t('mergeAllOther')}</button>
          </div>
        {/if}
      </div>
      {#if diff.conflicts.length === 0}
        <p class="none">{t('mergeNothing')}</p>
      {:else}
        <ul class="conflicts">
          {#each diff.conflicts as c (c.key)}
            <li class="conflict" class:picked={choices[c.key]}>
              <div class="path">
                <span class="kind">{kindLabel(c.kind)}</span>
                {#each fullPath(c) as seg, i}
                  {#if i > 0}<span class="sep">›</span>{/if}
                  <span class="seg" class:last={i === fullPath(c).length - 1}>{seg || t('vNone')}</span>
                {/each}
              </div>
              <div class="type">
                {typeLabel(c)}{#if c.children && c.childCount} · {t('mergeChildren', { n: c.childCount })}{/if}
              </div>
              <div class="options">
                {#each ['local', 'remote'] as side (side)}
                  <button class="opt {side}" class:sel={choices[c.key] === side} onclick={() => (choices[c.key] = side)} aria-pressed={choices[c.key] === side}>
                    <span class="radio"></span>
                    <span class="opt-body">
                      <span class="opt-side">{side === 'local' ? t('mergeThis') : otherName}</span>
                      {#if c.type === 'edit'}
                        {#each c.fields as f (f.field)}
                          <span class="fv"><span class="fl">{fieldLabel(f.field)}</span> {#if f.field === 'color'}<span class="swatch" style="background: {f[side]}"></span>{:else}{sideVal(f, side)}{/if}</span>
                        {/each}
                      {:else}
                        <span class="fv strong">{sideMeaning(c, side)}</span>
                        {#if (side === 'local' ? c.local : c.remote)}
                          {#each c.fields as f (f.field)}
                            <span class="fv"><span class="fl">{fieldLabel(f.field)}</span> {sideVal(f, side)}</span>
                          {/each}
                          {#if c.fields.length === 0}<span class="fv">{entityName(c)}</span>{/if}
                        {/if}
                      {/if}
                    </span>
                  </button>
                {/each}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section>
      <button class="sec-head toggle" onclick={() => (showAuto = !showAuto)} aria-expanded={showAuto}>
        <h3>{t('mergeAuto')} <span class="n">{diff.auto.length + orderNotes.length}</span></h3>
        <span class="chev" class:open={showAuto}><Icon name="chevron" size={14} /></span>
      </button>
      {#if showAuto}
        <ul class="auto">
          {#each diff.auto as a (a.key)}
            <li>
              <span class="chip {a.side}">{a.side === 'local' ? t('mergeThis') : a.side === 'remote' ? otherName : t('mergeThis') + ' + ' + otherName}</span>
              <span class="verb">{t(a.change === 'added' ? 'chAdded' : a.change === 'removed' ? 'chRemoved' : 'chEdited')}</span>
              <span class="apath">
                <span class="kind">{kindLabel(a.kind)}</span>
                {fullPath(a).filter(Boolean).join(' › ') || t('vNone')}
              </span>
              {#if a.fields.length}
                <span class="fields">
                  {#each a.fields as f (f.field)}
                    <span class="fv">
                      {#if a.side === 'both' && f.side}<span class="chip tiny {f.side}">{f.side === 'local' ? t('mergeThis') : f.side === 'remote' ? otherName : '='}</span>{/if}
                      <span class="fl">{fieldLabel(f.field)}</span>
                      {#if f.field === 'color'}<span class="swatch" style="background: {f.side === 'remote' ? f.remote : f.local}"></span>
                      {:else}<s>{sideVal(f, 'base')}</s> {sideVal(f, f.side === 'remote' ? 'remote' : 'local')}{/if}
                    </span>
                  {/each}
                </span>
              {/if}
            </li>
          {/each}
          {#each orderNotes as o (o.kind + ':' + o.id)}
            <li>
              <span class="chip local">{t('mergeThis')}</span>
              <span class="verb">{t('mergeOrderBoth')}</span>
              <span class="apath">{o.kind === 'boards' ? t('mergeOrderBoards') : o.kind === 'dump' ? t('dumpTab') : o.path.filter(Boolean).join(' › ')}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  </div>

  <footer>
    <div class="alts">
      <button class="ghost xs" onclick={() => keepAll('local')} disabled={busy}>{t('mergeKeepAllThis')}</button>
      <button class="ghost xs" onclick={() => keepAll('remote')} disabled={busy}>{t('mergeKeepAllOther')}</button>
    </div>
    <button class="primary" onclick={apply} disabled={left > 0 || busy}>
      <Icon name="check" size={14} />
      {t('mergeApply')}{#if left}<span class="left">{t('mergeLeft', { n: left })}</span>{/if}
    </button>
  </footer>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 120;
    background: rgba(0, 0, 0, 0.32);
  }
  .sheet {
    position: fixed;
    z-index: 121;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(680px, calc(100vw - 24px));
    max-height: min(88vh, 860px);
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-pop);
    padding: 12px 14px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
  }
  header h2 {
    flex: 1;
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
  }
  .intro {
    margin: 8px 0 0;
    font-size: 13px;
    line-height: 1.45;
    color: var(--text-muted);
  }
  .legend {
    display: flex;
    gap: 6px;
    margin: 8px 0 4px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 700;
    white-space: nowrap;
    flex: none;
  }
  .chip.local {
    background: var(--accent-soft);
    color: var(--accent-ink);
  }
  .chip.remote {
    background: oklch(0.93 0.06 75);
    color: oklch(0.42 0.1 60);
  }
  :root[data-theme='dark'] .chip.remote {
    background: oklch(0.32 0.06 70);
    color: oklch(0.88 0.08 80);
  }
  .chip.both {
    background: var(--surface-2);
    color: var(--text-muted);
  }
  .chip.tiny {
    padding: 0 6px;
    font-size: 10.5px;
  }
  .body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    margin-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding-right: 2px;
  }
  section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .sec-head {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 28px;
  }
  .sec-head h3 {
    flex: 1;
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
    text-align: left;
  }
  .n {
    display: inline-block;
    min-width: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: var(--surface-2);
    color: var(--text-muted);
    font-size: 11px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  .toggle {
    width: 100%;
    padding: 0;
    color: inherit;
  }
  .chev {
    display: inline-flex;
    color: var(--text-faint);
    transition: transform var(--fast) var(--ease);
  }
  .chev.open {
    transform: rotate(90deg);
  }
  .mini {
    display: flex;
    gap: 4px;
  }
  .none {
    margin: 0;
    padding: 10px 12px;
    font-size: 13px;
    color: var(--text-muted);
    background: var(--surface-2);
    border-radius: var(--radius-sm);
  }
  .conflicts,
  .auto {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .conflict {
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .conflict.picked {
    border-color: var(--border);
  }
  .path {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    font-size: 13px;
    color: var(--text-muted);
    min-width: 0;
  }
  .kind {
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-faint);
    margin-right: 2px;
  }
  .sep {
    color: var(--text-faint);
  }
  .seg.last {
    color: var(--text);
    font-weight: 700;
  }
  .type {
    font-size: 12.5px;
    color: #c2410c;
  }
  .options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .opt {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    text-align: left;
    color: var(--text);
    min-width: 0;
  }
  .opt:hover {
    background: var(--surface-hover);
  }
  .opt.sel {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .radio {
    width: 14px;
    height: 14px;
    margin-top: 2px;
    border-radius: 50%;
    border: 1.5px solid var(--border-strong);
    flex: none;
  }
  .opt.sel .radio {
    border-color: var(--accent);
    box-shadow: inset 0 0 0 3.5px var(--accent);
  }
  .opt-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .opt-side {
    font-size: 11.5px;
    font-weight: 700;
    color: var(--text-muted);
  }
  .opt.remote .opt-side {
    color: oklch(0.5 0.1 60);
  }
  .fv {
    font-size: 13px;
    color: var(--text);
    overflow-wrap: anywhere;
  }
  .fv.strong {
    font-weight: 700;
  }
  .fl {
    color: var(--text-faint);
    font-size: 11.5px;
    margin-right: 2px;
  }
  .swatch {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    vertical-align: -2px;
    border: 1px solid var(--border);
  }
  .auto li {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px;
    padding: 6px 8px;
    border-radius: var(--radius-xs);
    background: var(--surface-2);
    font-size: 13px;
  }
  .verb {
    font-weight: 700;
    color: var(--text);
  }
  .apath {
    color: var(--text-muted);
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .fields {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    width: 100%;
    padding-left: 2px;
  }
  .fields s {
    color: var(--text-faint);
  }
  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
  }
  .alts {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .ghost,
  .primary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: var(--radius-sm);
    font-size: 13.5px;
    font-weight: 600;
  }
  .ghost {
    color: var(--text-muted);
  }
  .ghost:hover {
    background: var(--surface-hover);
  }
  .ghost.xs {
    padding: 5px 9px;
    font-size: 12px;
  }
  .primary:disabled {
    opacity: 0.55;
    cursor: default;
  }
  .left {
    font-weight: 500;
    opacity: 0.85;
  }
  @media (max-width: 560px) {
    .options {
      grid-template-columns: 1fr;
    }
    footer {
      flex-direction: column-reverse;
      align-items: stretch;
    }
    .primary {
      justify-content: center;
    }
  }
</style>
