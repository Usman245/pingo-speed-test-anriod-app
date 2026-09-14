// Temporary press tracing — helps tell "the touch never reached the control"
// apart from "it reached it and the press was cancelled". Dev builds only.
export function tapIn(what) {
  if (__DEV__) console.log('[GAUGE] pressIn →', what);
}

export function tapDone(what) {
  if (__DEV__) console.log('[GAUGE] press   →', what);
}
