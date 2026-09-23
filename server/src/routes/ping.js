// Latency probe. The whole point is that the response body is empty and the
// server does no work, so what the client times is the round trip and nothing
// else. 204 keeps even the Content-Length off the wire.
//
// The Server-Timing header reports how long this process held the request, so a
// client that cares can subtract server-side cost from its RTT. In practice
// it's microseconds — it's here so you can prove that when a number looks odd.

import { corsHeaders, NO_CACHE } from '../lib/http.js';
import { config } from '../config.js';

export function handlePing(req, res) {
  const started = process.hrtime.bigint();
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

  res.writeHead(204, {
    ...corsHeaders(req),
    ...NO_CACHE,
    'Server-Timing': `app;dur=${elapsedMs.toFixed(3)}`,
    'X-Server-Id': config.id,
  });
  res.end();
}
