// ============================================================
// Memo sync hook. Memos are an append-only op log (see memo.svelte.js);
// this module is where those ops would leave the device. The public
// build keeps memos local to this browser, so it is a no-op. A
// deployment with its own store swaps this module for one that ships
// pending ops and applies remote ones through `start({ apply })`.
// ============================================================

/** Called once memos are loaded. `apply(op)` applies a remote op; `db` is the memo IndexedDB. */
export function start() {}

/** Called with every op produced on this device. */
export function enqueue() {}
