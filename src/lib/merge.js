// ============================================================
// Three-way merge of board documents, for sync conflicts.
//
// base   = what this device last synced (null when unknown)
// local  = this device now
// remote = the other side now
//
// Boards, projects and items are matched by id. A change on one side
// only is merged as is; the same field changed differently on both
// sides, or a delete on one side against an edit on the other, is a
// conflict the user settles per entity ('local' | 'remote').
// Everything here is plain data: no store, no UI.
// ============================================================

const ITEM_FIELDS = ['text', 'status', 'start', 'due', 'remind', 'big3', 'created', 'parent', 'where']
const PROJECT_FIELDS = ['title', 'color', 'parent']
const BOARD_FIELDS = ['name']
const FIELDS = { item: ITEM_FIELDS, project: PROJECT_FIELDS, board: BOARD_FIELDS }

// The Dump list (`doc.dump`, items outside every board) is indexed as the
// one project of a pseudo board, so its items merge like any other item.
// Both pseudo entities are fixed and never compared themselves.
export const DUMP = 'dump'
const DUMP_BOARD = '__dump__'
const pseudo = (id) => id === DUMP || id === DUMP_BOARD

/** Flatten a document into id-keyed maps plus the child orders. */
function index(doc) {
  const boards = new Map()
  const projects = new Map()
  const items = new Map()
  const order = { boards: [], projects: {}, items: {}, archive: {} }
  boards.set(DUMP_BOARD, { id: DUMP_BOARD, name: '' })
  projects.set(DUMP, { id: DUMP, parent: DUMP_BOARD, title: '', color: '' })
  order.projects[DUMP_BOARD] = [DUMP]
  order.items[DUMP] = []
  order.archive[DUMP] = []
  for (const it of doc?.dump ?? []) {
    if (!it?.id) continue
    items.set(it.id, itemEntity(it, DUMP, 'items'))
    order.items[DUMP].push(it.id)
  }
  for (const b of doc?.boards ?? []) {
    if (!b?.id) continue
    boards.set(b.id, { id: b.id, name: b.name ?? '' })
    order.boards.push(b.id)
    order.projects[b.id] = []
    for (const p of b.projects ?? []) {
      if (!p?.id) continue
      projects.set(p.id, { id: p.id, parent: b.id, title: p.title ?? '', color: p.color ?? '' })
      order.projects[b.id].push(p.id)
      order.items[p.id] = []
      order.archive[p.id] = []
      for (const it of p.items ?? []) {
        if (!it?.id) continue
        items.set(it.id, itemEntity(it, p.id, 'items'))
        order.items[p.id].push(it.id)
      }
      for (const it of p.archive ?? []) {
        if (!it?.id) continue
        items.set(it.id, itemEntity(it, p.id, 'archive'))
        order.archive[p.id].push(it.id)
      }
    }
  }
  return { boards, projects, items, order }
}
function itemEntity(it, parent, where) {
  return {
    id: it.id,
    text: it.text ?? '',
    status: it.status ?? 'default',
    start: it.start ?? null,
    due: it.due ?? null,
    remind: it.remind === true,
    big3: it.big3 === true,
    created: it.created ?? null,
    parent,
    where,
    archivedAt: it.archivedAt ?? null,
  }
}

const same = (a, b) => a === b || (a == null && b == null)
function sameEntity(kind, a, b) {
  return FIELDS[kind].every((f) => same(a[f], b[f]))
}
/** 'missing' | 'added' | 'removed' | 'same' | 'edited' relative to base. */
function change(kind, base, side) {
  if (!base && !side) return 'missing'
  if (!base) return 'added'
  if (!side) return 'removed'
  return sameEntity(kind, base, side) ? 'same' : 'edited'
}

/**
 * Compare the three documents. Returns
 *   { auto: [...], conflicts: [...], noBase, merge(choices) }
 * where merge(choices) builds the merged document once every conflict has a
 * choice ({ [key]: 'local' | 'remote' }). Entries carry a `key` ("item:<id>"),
 * a `path` (board / project / item names) and human-readable field changes.
 */
export function diffBoards(baseDoc, localDoc, remoteDoc) {
  const noBase = baseDoc == null
  const B = index(noBase ? null : baseDoc)
  const L = index(localDoc)
  const R = index(remoteDoc)

  const auto = []
  const conflicts = []
  // merged entity fields, decided here; conflicts are patched in merge()
  const merged = { board: new Map(), project: new Map(), item: new Map() }
  // per entity: the fields still open (conflict) and the two candidates
  const open = new Map()

  // which children changed on each side (to escalate a parent delete)
  const childTouched = { local: new Set(), remote: new Set() }
  const changedIds = { local: new Set(), remote: new Set() } // entities added/edited per side

  const kinds = [
    ['item', B.items, L.items, R.items],
    ['project', B.projects, L.projects, R.projects],
    ['board', B.boards, L.boards, R.boards],
  ]
  for (const [kind, bm, lm, rm] of kinds) {
    const ids = new Set([...bm.keys(), ...lm.keys(), ...rm.keys()])
    for (const id of ids) {
      const b = bm.get(id) ?? null
      const l = lm.get(id) ?? null
      const r = rm.get(id) ?? null
      const lc = change(kind, b, l)
      const rc = change(kind, b, r)
      const key = `${kind}:${id}`
      if (pseudo(id)) {
        merged[kind].set(id, { ...(l ?? r ?? b) })
        continue
      }
      const parentOf = (e) => (kind === 'item' || kind === 'project' ? e?.parent : null)
      const touch = (side, e) => {
        const p = parentOf(e)
        if (p) childTouched[side].add(p)
      }
      if (lc === 'added' || lc === 'edited') {
        touch('local', l)
        changedIds.local.add(id)
      }
      if (rc === 'added' || rc === 'edited') {
        touch('remote', r)
        changedIds.remote.add(id)
      }

      if (lc === 'missing' && rc === 'missing') continue
      if (lc === 'same' && rc === 'same') {
        merged[kind].set(id, { ...b })
        continue
      }
      // one side only, no base: cannot tell an add from a delete
      if (noBase && (lc === 'missing' || rc === 'missing')) {
        const side = lc === 'missing' ? 'remote' : 'local'
        conflicts.push({ key, kind, id, type: side === 'local' ? 'only-local' : 'only-remote', local: l, remote: r, fields: [] })
        open.set(key, { local: l, remote: r, fields: null })
        continue
      }
      if (lc === 'added' && rc === 'missing') {
        merged[kind].set(id, { ...l })
        auto.push({ key, kind, id, side: 'local', change: 'added', entity: l, fields: [] })
        continue
      }
      if (rc === 'added' && lc === 'missing') {
        merged[kind].set(id, { ...r })
        auto.push({ key, kind, id, side: 'remote', change: 'added', entity: r, fields: [] })
        continue
      }
      if (lc === 'added' && rc === 'added') {
        if (sameEntity(kind, l, r)) {
          merged[kind].set(id, { ...l })
          auto.push({ key, kind, id, side: 'both', change: 'added', entity: l, fields: [] })
        } else {
          const fields = FIELDS[kind].filter((f) => !same(l[f], r[f])).map((f) => ({ field: f, base: null, local: l[f], remote: r[f] }))
          conflicts.push({ key, kind, id, type: 'edit', local: l, remote: r, fields })
          open.set(key, { local: l, remote: r, fields: fields.map((x) => x.field), rest: { ...l } })
        }
        continue
      }
      if (lc === 'removed' && rc === 'removed') continue
      if (lc === 'removed' && rc === 'same') {
        auto.push({ key, kind, id, side: 'local', change: 'removed', entity: b, fields: [], deferred: true })
        continue
      }
      if (rc === 'removed' && lc === 'same') {
        auto.push({ key, kind, id, side: 'remote', change: 'removed', entity: b, fields: [], deferred: true })
        continue
      }
      if (lc === 'removed' || rc === 'removed') {
        // delete on one side, edit on the other
        const type = lc === 'removed' ? 'delete-local' : 'delete-remote'
        const kept = lc === 'removed' ? r : l
        const fields = FIELDS[kind].filter((f) => !same(b[f], kept[f])).map((f) => ({ field: f, base: b[f], local: l?.[f], remote: r?.[f] }))
        conflicts.push({ key, kind, id, type, local: l, remote: r, fields })
        open.set(key, { local: l, remote: r, fields: null })
        continue
      }
      // edited on at least one side, present on both
      const out = { ...b }
      const changedFields = []
      const clash = []
      for (const f of FIELDS[kind]) {
        const bv = b[f], lv = l[f], rv = r[f]
        if (same(lv, rv)) {
          out[f] = lv
          if (!same(bv, lv)) changedFields.push({ field: f, base: bv, local: lv, remote: rv, side: 'both' })
        } else if (same(lv, bv)) {
          out[f] = rv
          changedFields.push({ field: f, base: bv, local: lv, remote: rv, side: 'remote' })
        } else if (same(rv, bv)) {
          out[f] = lv
          changedFields.push({ field: f, base: bv, local: lv, remote: rv, side: 'local' })
        } else {
          clash.push({ field: f, base: bv, local: lv, remote: rv })
        }
      }
      if (kind === 'item') out.archivedAt = l.archivedAt ?? r.archivedAt ?? b.archivedAt ?? null
      merged[kind].set(id, out)
      if (changedFields.length) {
        const sides = new Set(changedFields.map((c) => c.side))
        const side = sides.size === 1 ? [...sides][0] : 'both'
        auto.push({ key, kind, id, side, change: 'edited', entity: out, fields: changedFields })
      }
      if (clash.length) {
        conflicts.push({ key, kind, id, type: 'edit', local: l, remote: r, fields: clash })
        open.set(key, { local: l, remote: r, fields: clash.map((c) => c.field), rest: out })
      }
    }
  }

  // a container deleted on one side while the other side changed something
  // inside it: not a quiet delete, ask
  const escalate = (kind) => {
    for (let i = auto.length - 1; i >= 0; i--) {
      const a = auto[i]
      if (a.kind !== kind || a.change !== 'removed') continue
      const other = a.side === 'local' ? 'remote' : 'local'
      if (!childTouched[other].has(a.id)) continue
      auto.splice(i, 1)
      const type = a.side === 'local' ? 'delete-local' : 'delete-remote'
      const sideMap = a.side === 'local' ? { local: null, remote: a.entity } : { local: a.entity, remote: null }
      conflicts.push({ key: a.key, kind, id: a.id, type, ...sideMap, fields: [], children: true })
      open.set(a.key, { ...sideMap, fields: null })
    }
  }
  escalate('project')
  escalate('board')
  // children of a container that is itself in question follow the container's
  // choice: their own delete-vs-edit entries would only repeat the question
  const inQuestion = new Set(conflicts.filter((c) => c.children).map((c) => c.id))
  if (inQuestion.size) {
    const under = (kind, id) => {
      const e =
        (kind === 'item' ? L.items.get(id) ?? R.items.get(id) ?? B.items.get(id) : L.projects.get(id) ?? R.projects.get(id) ?? B.projects.get(id)) ?? null
      if (!e) return false
      if (inQuestion.has(e.parent)) return true
      return kind === 'item' ? under('project', e.parent) : false
    }
    // untouched children deleted along with the container: they come back if
    // the container is kept, so they are not quiet deletes either
    for (let i = auto.length - 1; i >= 0; i--) {
      const a = auto[i]
      if (a.change !== 'removed' || a.kind === 'board') continue
      if (!under(a.kind, a.id)) continue
      merged[a.kind].set(a.id, { ...a.entity })
      auto.splice(i, 1)
    }
    for (let i = conflicts.length - 1; i >= 0; i--) {
      const c = conflicts[i]
      if (c.children || c.kind === 'board') continue
      if ((c.type === 'delete-local' || c.type === 'delete-remote') && under(c.kind, c.id)) {
        const o = open.get(c.key)
        const kept = o.local ?? o.remote
        merged[c.kind].set(c.id, { ...kept }) // survives only if the container does
        open.delete(c.key)
        conflicts.splice(i, 1)
      }
    }
  }

  // names for paths: prefer local, then remote, then base
  const nameOf = (kind, id) => {
    const m = kind === 'board' ? [L.boards, R.boards, B.boards] : kind === 'project' ? [L.projects, R.projects, B.projects] : [L.items, R.items, B.items]
    for (const map of m) {
      const e = map.get(id)
      if (e) return kind === 'board' ? e.name : kind === 'project' ? e.title : e.text
    }
    return ''
  }
  const parentOf = (kind, id) => {
    const m = kind === 'project' ? [L.projects, R.projects, B.projects] : [L.items, R.items, B.items]
    for (const map of m) {
      const e = map.get(id)
      if (e) return e.parent
    }
    return null
  }
  const pathOf = (kind, id) => {
    if (kind === 'board') return [nameOf('board', id)]
    if (kind === 'project') return [nameOf('board', parentOf('project', id)), nameOf('project', id)]
    const pid = parentOf('item', id)
    if (pid === DUMP) return [nameOf('item', id)] // the entry is flagged `dump` instead
    return [nameOf('board', parentOf('project', pid)), nameOf('project', pid), nameOf('item', id)]
  }
  const name = { board: (id) => nameOf('board', id), project: (id) => nameOf('project', id) }
  for (const e of [...auto, ...conflicts]) {
    e.path = pathOf(e.kind, e.id)
    if (e.kind === 'item' && parentOf('item', e.id) === DUMP) e.dump = true
  }
  for (const c of conflicts) {
    if (c.children) {
      const kidsChanged = (side) => {
        const S = side === 'local' ? L : R
        const ch = changedIds[side]
        if (c.kind === 'project') return [...S.items.values()].filter((it) => it.parent === c.id && ch.has(it.id)).length
        let n = 0
        for (const p of S.projects.values()) {
          if (p.parent !== c.id) continue
          if (ch.has(p.id)) n += 1
          n += [...S.items.values()].filter((it) => it.parent === p.id && ch.has(it.id)).length
        }
        return n
      }
      c.childCount = kidsChanged(c.type === 'delete-local' ? 'remote' : 'local')
    }
  }
  // label the parent field with the project title so the UI can show a move
  for (const e of [...auto, ...conflicts]) for (const f of e.fields ?? []) if (f.field === 'parent') {
    f.localName = e.kind === 'item' ? name.project(f.local) : name.board(f.local)
    f.remoteName = e.kind === 'item' ? name.project(f.remote) : name.board(f.remote)
    f.baseName = e.kind === 'item' ? name.project(f.base) : name.board(f.base)
  }

  // ---- orders ----
  const orderNote = []
  function mergeOrder(bo, lo, ro, present) {
    const has = (arr, id) => arr.includes(id)
    const common = (a, b) => a.filter((id) => has(b, id))
    const bl = bo ? common(bo, lo) : null
    const lb = bo ? common(lo, bo) : lo
    const br = bo ? common(bo, ro) : null
    const rb = bo ? common(ro, bo) : ro
    const localMoved = bo ? bl.join() !== lb.join() : false
    const remoteMoved = bo ? br.join() !== rb.join() : false
    let primary, other
    if (localMoved || !remoteMoved) [primary, other] = [lo, ro]
    else [primary, other] = [ro, lo]
    const out = primary.filter((id) => present.has(id))
    for (const id of present) {
      if (out.includes(id)) continue
      const src = other.includes(id) ? other : primary.includes(id) ? primary : null
      let at = out.length
      if (src) {
        const i = src.indexOf(id)
        for (let j = i - 1; j >= 0; j--) {
          const k = out.indexOf(src[j])
          if (k >= 0) {
            at = k + 1
            break
          }
        }
        if (at === out.length && i === 0 && src.length > 1) {
          const k = out.indexOf(src[1])
          if (k >= 0) at = k
        }
      }
      out.splice(at, 0, id)
    }
    for (const id of [...present].filter((id) => !out.includes(id))) out.push(id)
    return { order: out, both: localMoved && remoteMoved && lo.join() !== ro.join() }
  }

  function merge(choices = {}) {
    const pick = (key) => choices[key]
    const final = { board: new Map(), project: new Map(), item: new Map() }
    for (const kind of ['board', 'project', 'item']) for (const [id, e] of merged[kind]) final[kind].set(id, { ...e })
    for (const c of conflicts) {
      const side = pick(c.key)
      if (!side) throw new Error('unresolved:' + c.key)
      const o = open.get(c.key)
      const chosen = side === 'local' ? o.local : o.remote
      if (o.fields) {
        const e = { ...o.rest }
        for (const f of o.fields) e[f] = chosen[f]
        final[c.kind].set(c.id, e)
      } else if (chosen) final[c.kind].set(c.id, { ...chosen })
      else final[c.kind].delete(c.id)
    }
    // containment: drop children whose parent is gone
    for (const [id, p] of final.project) if (!final.board.has(p.parent)) final.project.delete(id)
    for (const [id, it] of final.item) if (!final.project.has(it.parent)) final.item.delete(id)

    orderNote.length = 0
    const boardsPresent = new Set(final.board.keys())
    const bo = mergeOrder(noBase ? null : B.order.boards, L.order.boards, R.order.boards, boardsPresent)
    if (bo.both) orderNote.push({ kind: 'boards', id: null, path: [] })
    const dumpPresent = new Set([...final.item.values()].filter((it) => it.parent === DUMP).map((it) => it.id))
    const dOrder = mergeOrder(noBase ? null : B.order.items[DUMP], L.order.items[DUMP], R.order.items[DUMP], dumpPresent)
    if (dOrder.both) orderNote.push({ kind: 'dump', id: null, path: [] })
    const dump = dOrder.order.map((iid) => {
      const it = final.item.get(iid)
      return { id: it.id, text: it.text, status: it.status, start: it.start, due: it.due, remind: it.remind, big3: it.big3, created: it.created }
    })
    const boards = bo.order.filter((bid) => !pseudo(bid)).map((bid) => {
      const present = new Set([...final.project.values()].filter((p) => p.parent === bid).map((p) => p.id))
      const po = mergeOrder(noBase ? null : B.order.projects[bid] ?? [], L.order.projects[bid] ?? [], R.order.projects[bid] ?? [], present)
      if (po.both) orderNote.push({ kind: 'board', id: bid, path: [nameOf('board', bid)] })
      const projects = po.order.map((pid) => {
        const p = final.project.get(pid)
        const mk = (where) => {
          const pres = new Set([...final.item.values()].filter((it) => it.parent === pid && it.where === where).map((it) => it.id))
          const io = mergeOrder(noBase ? null : B.order[where][pid] ?? [], L.order[where][pid] ?? [], R.order[where][pid] ?? [], pres)
          if (io.both && where === 'items') orderNote.push({ kind: 'project', id: pid, path: [nameOf('board', bid), nameOf('project', pid)] })
          return io.order.map((iid) => {
            const it = final.item.get(iid)
            const out = { id: it.id, text: it.text, status: it.status, start: it.start, due: it.due, remind: it.remind, big3: it.big3, created: it.created }
            if (where === 'archive') out.archivedAt = it.archivedAt
            return out
          })
        }
        return { id: p.id, title: p.title, color: p.color, items: mk('items'), archive: mk('archive') }
      })
      const b = final.board.get(bid)
      return { id: b.id, name: b.name, projects }
    })
    return { version: localDoc?.version ?? remoteDoc?.version ?? 1, boards, dump, orderNotes: [...orderNote] }
  }

  return { auto, conflicts, noBase, merge }
}
