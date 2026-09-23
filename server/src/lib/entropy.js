// The download payload has to be incompressible.
//
// If it weren't, any gzip-capable middlebox between the phone and here — a
// carrier proxy, a corporate TLS inspector, a CDN with compression left on —
// would shrink zeros to nothing and report a link that looks ten times faster
// than it is. Random bytes can't be compressed, so what leaves the NIC is what
// the client has to receive.
//
// Generating randomness per request would make the CPU, not the link, the
// bottleneck at multi-gigabit rates. Instead we generate one pool at boot and
// hand out views into it. The pool is never mutated, so concurrent responses
// can safely share the same backing memory.

import { randomFillSync } from 'node:crypto';

const POOL_BYTES = 16 * 1024 * 1024;
const pool = Buffer.allocUnsafe(POOL_BYTES);

// randomFillSync caps at 2^31-1 per call but is happiest in smaller slices.
for (let i = 0; i < POOL_BYTES; i += 65536) {
  randomFillSync(pool, i, Math.min(65536, POOL_BYTES - i));
}

let cursor = 0;

// Returns a view of `length` bytes. Views wrap around the pool, and the cursor
// advances between calls so two concurrent streams aren't sending byte-for-byte
// identical traffic (which some deduplicating middleboxes would collapse).
export function chunk(length) {
  if (cursor + length > POOL_BYTES) cursor = 0;
  const view = pool.subarray(cursor, cursor + length);
  cursor += length;
  return view;
}

export const POOL_SIZE = POOL_BYTES;
