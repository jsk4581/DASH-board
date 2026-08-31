// ============================================================
// Tiny promise wrapper over IndexedDB. Memos are record-shaped
// (a thread, a message) and grow without bound, which is exactly
// what localStorage's single-string, 5 MB model is bad at.
// ============================================================

function wrap(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Open (and upgrade) a database. `upgrade(db)` runs inside versionchange. */
export function openDB(name, version, upgrade) {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('no-indexeddb'))
  const req = indexedDB.open(name, version)
  req.onupgradeneeded = () => upgrade(req.result)
  return wrap(req)
}

function store(db, name, mode) {
  return db.transaction(name, mode).objectStore(name)
}

export const idb = {
  get: (db, name, key) => wrap(store(db, name, 'readonly').get(key)),
  getAll: (db, name) => wrap(store(db, name, 'readonly').getAll()),
  put: (db, name, value, key) => wrap(store(db, name, 'readwrite').put(value, key)),
  del: (db, name, key) => wrap(store(db, name, 'readwrite').delete(key)),
  clear: (db, name) => wrap(store(db, name, 'readwrite').clear()),
  /** Several writes in one transaction: `ops` is [[name, 'put'|'del', value|key, key?], ...] */
  batch(db, names, ops) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(names, 'readwrite')
      for (const [name, kind, a, b] of ops) {
        const s = tx.objectStore(name)
        kind === 'del' ? s.delete(a) : s.put(a, b)
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  },
}
