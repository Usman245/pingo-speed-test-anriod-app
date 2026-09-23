// Throughput and latency measurement.
//
// The engine is backend-agnostic: it is handed an adapter from speedServers.js
// and only ever asks it for URLs. Point it at your own node and the numbers get
// better, not different.
//
// What makes a reading honest, in rough order of how much each one matters:
//
//  - Parallel connections. A single TCP stream is limited by window size and
//    round-trip time, not by the link. On a 300 Mbps line 40 ms from the
//    server, one stream tops out near 100 Mbps no matter how fast the link is.
//    Six streams fill the pipe.
//  - Discarding slow start. TCP begins cautiously and ramps. The first second
//    is ramp, not capacity, so it is measured and thrown away.
//  - Adaptive payload size. A fixed chunk that takes 6 s on 3G takes 40 ms on
//    fibre, and at 40 ms the request overhead is most of what you measured.
//    Chunks grow and shrink to land in a useful range on any link.
//  - Ending the window at the last counted byte. If the window closes while
//    data is in flight, charging that dead time against the total reads low.
//
// Two React Native specifics:
//  - responseType 'blob' keeps the payload in native memory. With the default
//    text type RN decodes every megabyte into a JS string, which stalls the JS
//    thread and corrupts the very timing it is meant to measure.
//  - the upload body is a cached ASCII string, not a typed array. RN base64s
//    ArrayBuffers on the bridge, which both costs CPU and inflates the bytes.

import { pickBestServer } from './speedServers';

export const WARMUP_MS = 1000;

const DOWN_STREAMS = 6;
const UP_STREAMS = 4;

// Adaptive chunk bounds. The floor keeps per-request overhead from dominating
// on a fast link; the ceiling keeps a slow link from spending the whole test
// window inside one request, and keeps the native blob buffer modest.
const DOWN_CHUNK_START = 4 * 1024 * 1024;
const DOWN_CHUNK_MIN = 1 * 1024 * 1024;
const DOWN_CHUNK_MAX = 32 * 1024 * 1024;
// Without progress events the only granularity we get is whole chunks, so cap
// growth to keep the live needle from freezing between completions.
const DOWN_CHUNK_MAX_BLIND = 8 * 1024 * 1024;

const UP_CHUNK_START = 512 * 1024;
const UP_CHUNK_MIN = 256 * 1024;
const UP_CHUNK_MAX = 8 * 1024 * 1024;

// A chunk that completes faster than this is mostly overhead; slower than that
// and it is too coarse to steer the test.
const CHUNK_FAST_MS = 1000;
const CHUNK_SLOW_MS = 3000;

const TICK_MS = 120;
const LIVE_WINDOW_MS = 900;

// --- upload payloads ------------------------------------------------------

const payloads = new Map();
function uploadPayload(bytes) {
  let p = payloads.get(bytes);
  if (!p) {
    p = 'x'.repeat(bytes);
    payloads.set(bytes, p);
  }
  return p;
}

// --- meter ----------------------------------------------------------------

// Counts bytes across all streams, reports a short-window live rate for the
// needle, and resolves with the post-warm-up aggregate once the window closes.
function createMeter({ durationMs, warmupMs, cancelToken, onTick }) {
  const startedAt = Date.now();
  const samples = [{ t: startedAt, bytes: 0 }];
  const meter = {
    total: 0,
    done: false,
    xhrs: new Set(),
    lastCountedAt: startedAt,
    peakMbps: 0,
  };
  let warm = null;

  meter.promise = new Promise((resolve) => {
    meter.stop = () => {
      if (meter.done) return;
      meter.done = true;
      clearInterval(meter.timer);
      meter.xhrs.forEach((x) => {
        try {
          x.abort();
        } catch {
          // already settled
        }
      });
      meter.xhrs.clear();
      const from = warm || { t: startedAt, bytes: 0 };
      // End the window at the last byte actually counted, so data still in
      // flight when the window closes isn't charged as zero-throughput time.
      const seconds = Math.max(0.3, (meter.lastCountedAt - from.t) / 1000);
      const bytes = Math.max(0, meter.total - from.bytes);
      resolve({
        mbps: (bytes * 8) / seconds / 1e6,
        peakMbps: meter.peakMbps,
        bytes,
        seconds,
      });
    };
  });

  meter.count = (bytes) => {
    if (bytes <= 0) return;
    meter.total += bytes;
    meter.lastCountedAt = Date.now();
  };

  meter.timer = setInterval(() => {
    if (cancelToken?.cancelled) {
      meter.stop();
      return;
    }
    const now = Date.now();
    const elapsed = now - startedAt;
    samples.push({ t: now, bytes: meter.total });
    while (samples.length > 2 && now - samples[0].t > LIVE_WINDOW_MS) samples.shift();
    if (!warm && elapsed >= warmupMs) warm = { t: now, bytes: meter.total };

    const first = samples[0];
    const seconds = Math.max(0.15, (now - first.t) / 1000);
    const instant = ((meter.total - first.bytes) * 8) / seconds / 1e6;
    // Peak is only meaningful once the link has ramped.
    if (warm && instant > meter.peakMbps) meter.peakMbps = instant;

    onTick?.(instant, Math.min(1, elapsed / durationMs));
    if (elapsed >= durationMs) meter.stop();
  }, TICK_MS);

  return meter;
}

// Grows or shrinks the shared chunk size based on how long the last one took.
function nextChunkSize(current, elapsedMs, { min, max }) {
  if (elapsedMs < CHUNK_FAST_MS) return Math.min(max, current * 2);
  if (elapsedMs > CHUNK_SLOW_MS) return Math.max(min, Math.floor(current / 2));
  return current;
}

// --- download -------------------------------------------------------------

export function measureDownload(server, durationMs, cancelToken, onTick) {
  const meter = createMeter({ durationMs, warmupMs: WARMUP_MS, cancelToken, onTick });
  let chunkBytes = DOWN_CHUNK_START;
  let sawProgress = false;

  const spawn = () => {
    if (meter.done) return;
    const bytes = chunkBytes;
    const startedAt = Date.now();
    const xhr = new XMLHttpRequest();
    let counted = 0;

    try {
      xhr.responseType = 'blob';
    } catch {
      // older RN without blob support falls back to text
    }

    xhr.open('GET', server.downloadUrl(bytes));
    xhr.onprogress = (e) => {
      sawProgress = true;
      meter.count(e.loaded - counted);
      counted = e.loaded;
    };
    xhr.onload = () => {
      meter.count(bytes - counted);
      const ceiling = sawProgress ? DOWN_CHUNK_MAX : DOWN_CHUNK_MAX_BLIND;
      chunkBytes = nextChunkSize(bytes, Date.now() - startedAt, {
        min: DOWN_CHUNK_MIN,
        max: ceiling,
      });
      try {
        xhr.response?.close?.();
      } catch {
        // best-effort release of the native blob
      }
      meter.xhrs.delete(xhr);
      spawn();
    };
    xhr.onerror = () => {
      meter.xhrs.delete(xhr);
      // One failed request shouldn't collapse a stream for the rest of the run.
      if (!meter.done) setTimeout(spawn, 150);
    };
    xhr.onabort = () => meter.xhrs.delete(xhr);

    meter.xhrs.add(xhr);
    xhr.send();
  };

  for (let i = 0; i < DOWN_STREAMS; i++) spawn();
  return meter.promise;
}

// --- upload ---------------------------------------------------------------

export function measureUpload(server, durationMs, cancelToken, onTick) {
  const meter = createMeter({ durationMs, warmupMs: WARMUP_MS, cancelToken, onTick });
  let chunkBytes = UP_CHUNK_START;

  const spawn = () => {
    if (meter.done) return;
    const bytes = chunkBytes;
    const startedAt = Date.now();
    const xhr = new XMLHttpRequest();
    let counted = 0;

    xhr.open('POST', server.uploadUrl());
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');

    if (xhr.upload) {
      xhr.upload.onprogress = (e) => {
        meter.count(e.loaded - counted);
        counted = e.loaded;
      };
    }
    xhr.onload = () => {
      // Progress events fire as bytes leave the phone; the load event is the
      // server's acknowledgement. Counting the remainder here rather than at
      // first byte out keeps a buffered socket from inflating the reading.
      meter.count(bytes - counted);
      chunkBytes = nextChunkSize(bytes, Date.now() - startedAt, {
        min: UP_CHUNK_MIN,
        max: UP_CHUNK_MAX,
      });
      meter.xhrs.delete(xhr);
      spawn();
    };
    xhr.onerror = () => {
      meter.xhrs.delete(xhr);
      if (!meter.done) setTimeout(spawn, 150);
    };
    xhr.onabort = () => meter.xhrs.delete(xhr);

    meter.xhrs.add(xhr);
    xhr.send(uploadPayload(bytes));
  };

  for (let i = 0; i < UP_STREAMS; i++) spawn();
  return meter.promise;
}

// --- latency --------------------------------------------------------------

const PING_TIMEOUT_MS = 3000;
const PING_GAP_MS = 60;

export async function measureLatency(server, count, cancelToken, onSample) {
  const times = [];
  let lost = 0;

  // One unmeasured probe first: it pays for DNS and the TLS handshake so the
  // samples that follow measure the network rather than the setup.
  try {
    await withTimeout(fetch(server.pingUrl(), { cache: 'no-store' }), PING_TIMEOUT_MS);
  } catch {
    // an unreachable server will show up as loss in the samples below
  }

  for (let i = 0; i < count; i++) {
    if (cancelToken?.cancelled) break;
    const t0 = Date.now();
    try {
      await withTimeout(fetch(server.pingUrl(), { cache: 'no-store' }), PING_TIMEOUT_MS);
      const rtt = Date.now() - t0;
      times.push(rtt);
      onSample?.(rtt, i + 1, count);
    } catch {
      lost += 1;
    }
    if (i < count - 1) await sleep(PING_GAP_MS);
  }

  const attempted = times.length + lost;
  if (!times.length) {
    return { latency: 0, jitter: 0, loss: attempted ? 100 : 0, min: 0, max: 0 };
  }

  // Latency is reported as the minimum: it is the sample that queued the least,
  // so it describes the path rather than whatever else the radio was doing.
  //
  // Jitter is the mean absolute difference between consecutive samples (RFC
  // 3550). Measured over raw HTTP samples that is far too eager: one request
  // that stalls on a re-handshake or a GC pause lands as a 250 ms spike, and a
  // single spike in six samples drags the mean to ~60 ms on a link whose real
  // jitter is 2 ms. So the obvious outliers are dropped first — anything more
  // than twice the median is app or radio noise, not path variation.
  const ordered = [...times].sort((a, b) => a - b);
  const median = ordered[Math.floor(ordered.length / 2)];
  const steady = times.filter((t) => t <= median * 2 + 20);
  const usable = steady.length > 1 ? steady : times;

  let jitter = 0;
  if (usable.length > 1) {
    let sum = 0;
    for (let i = 1; i < usable.length; i++) sum += Math.abs(usable[i] - usable[i - 1]);
    jitter = sum / (usable.length - 1);
  }

  return {
    latency: Math.min(...times),
    jitter: Math.round(jitter * 10) / 10,
    loss: attempted ? Math.round((lost / attempted) * 1000) / 10 : 0,
    min: Math.min(...times),
    max: Math.max(...times),
  };
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- server info ----------------------------------------------------------

// Kept for the screens that only want a label for the chosen node.
export async function fetchTestServer(options) {
  const server = await pickBestServer(options);
  return {
    id: server.id,
    kind: server.kind,
    colo: server.colo || null,
    city: server.city || server.name,
    label: server.label,
    server,
  };
}

export { pickBestServer };
