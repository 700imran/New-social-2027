// Warms data for the next likely screen while a finger is still on the way
// down, instead of waiting for the tap to register. `PostDetail` already
// renders the post itself instantly from the in-memory feed (see
// AppContext.jsx's `posts` state) — the one real per-navigation network
// call left is `loadComments`, so that's what this warms.
//
// onTouchStart fires well before onClick on a real touchscreen (the touch
// has to lift and the click has to synthesize afterward), so by the time
// the tap actually registers, comments are usually already in flight or
// done. onMouseEnter covers desktop/dev — harmless on touch devices since
// they don't fire synthetic mouseenter on tap in any browser this app
// targets.
export function usePrefetchOnIntent(prefetchFn) {
  return {
    onTouchStart: prefetchFn,
    onMouseEnter: prefetchFn,
  }
}
