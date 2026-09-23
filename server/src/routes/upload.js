// Upload sink.
//
// The body is counted and thrown away, never buffered. A body parser with a
// 100 MB limit would hold every concurrent upload in RSS at once and turn a
// handful of phones into an OOM kill; draining the stream costs nothing.
//
// The response is deliberately tiny and sent only after 'end', so the client's
// completion timestamp corresponds to the last byte actually arriving here.

import { sendJson } from '../lib/http.js';
import { config } from '../config.js';

export function handleUpload(req, res) {
  const startedAt = process.hrtime.bigint();
  let received = 0;
  let rejected = false;

  req.on('data', (buf) => {
    received += buf.length;
    if (received > config.maxUploadBytes && !rejected) {
      rejected = true;
      sendJson(req, res, 413, { error: 'body exceeds MAX_UPLOAD_BYTES', max: config.maxUploadBytes });
      // Tear the socket down: a 413 mid-body can't be read by a client that is
      // still writing, so there is nothing to gain by draining the rest.
      req.destroy();
    }
  });

  req.on('aborted', () => {
    // Client gave up mid-body. Normal when a test window closes — not an error.
  });

  req.on('error', () => {
    if (!rejected && !res.headersSent) sendJson(req, res, 400, { error: 'upload stream failed' });
  });

  req.on('end', () => {
    if (rejected) return;
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    sendJson(req, res, 200, {
      received,
      durationMs: Math.round(durationMs * 100) / 100,
      // What the server saw. A client that trusts this over its own clock gets
      // a reading free of JS timer jitter, though it misses the last ack.
      mbps: durationMs > 0 ? Math.round(((received * 8) / (durationMs / 1000) / 1e6) * 100) / 100 : 0,
    });
  });
}
