// Download throughput source.
//
// Streams exactly `bytes` of incompressible data as fast as the socket will
// take it. Three things matter for the number to be honest:
//
//  - Content-Length is set, so the client knows the total and can abort mid
//    stream without the count being ambiguous.
//  - identity encoding, declared explicitly. If anything gzipped this the
//    client would measure decompressed bytes against wire time.
//  - backpressure is respected. Writing in a loop without checking the return
//    value of res.write() buffers the whole response in the process's memory
//    and reports the speed of memcpy, not of the network.

import { chunk } from '../lib/entropy.js';
import { corsHeaders, NO_CACHE, sendJson } from '../lib/http.js';
import { config } from '../config.js';

const WRITE_CHUNK = 256 * 1024;

export function handleDownload(req, res, url) {
  const requested = Number.parseInt(url.searchParams.get('bytes') ?? '', 10);
  const size = Number.isFinite(requested)
    ? Math.min(Math.max(requested, 0), config.maxDownloadBytes)
    : config.defaultDownloadBytes;

  if (Number.isFinite(requested) && requested > config.maxDownloadBytes) {
    sendJson(req, res, 413, {
      error: 'requested size exceeds MAX_DOWNLOAD_BYTES',
      max: config.maxDownloadBytes,
    });
    return;
  }

  const headers = {
    ...corsHeaders(req),
    ...NO_CACHE,
    'Content-Type': 'application/octet-stream',
    'Content-Length': String(size),
    'Content-Encoding': 'identity',
    // Stops any client-side viewer from trying to render 100 MB of noise.
    'Content-Disposition': 'attachment; filename="payload.bin"',
    'X-Server-Id': config.id,
  };

  if (req.method === 'HEAD') {
    res.writeHead(200, headers);
    res.end();
    return;
  }

  res.writeHead(200, headers);
  res.flushHeaders();

  if (size === 0) {
    res.end();
    return;
  }

  let sent = 0;
  let aborted = false;

  const stop = () => {
    aborted = true;
    res.removeListener('drain', pump);
  };
  res.on('close', stop);
  res.on('error', stop);

  function pump() {
    while (!aborted && sent < size) {
      const view = chunk(Math.min(WRITE_CHUNK, size - sent));
      sent += view.length;
      // False means the kernel buffer is full: stop and wait for 'drain'
      // rather than queueing the rest in userland.
      if (!res.write(view)) {
        res.once('drain', pump);
        return;
      }
    }
    if (!aborted) res.end();
  }

  pump();
}
