// Real throughput measurement against Cloudflare's public speed-test edge.
//
// Method follows what desktop speed tests do: several parallel connections to
// fill the pipe, the first second discarded so TCP slow-start doesn't drag the
// average down, and throughput averaged over the remaining window.
//
// Two React Native specifics matter a lot here:
//  - responseType 'blob' keeps the payload in native memory. With the default
//    text type RN decodes every megabyte into a JS string, which stalls the JS
//    thread and corrupts the timing it is supposed to measure.
//  - the upload body is a small chunk sent many times, never one huge string.
const DOWN_URL = 'https://speed.cloudflare.com/__down';
const UP_URL = 'https://speed.cloudflare.com/__up';

// Kept small on purpose: if a platform doesn't emit download progress events we
// fall back to counting whole completed chunks, and small chunks keep that
// fallback fine-grained (and the native blob buffer cheap).
const DOWN_CHUNK = 2 * 1024 * 1024;
const UP_CHUNK_SMALL = 512 * 1024;
const UP_CHUNK_LARGE = 2 * 1024 * 1024;
const DOWN_STREAMS = 4;
const UP_STREAMS = 3;

export const WARMUP_MS = 1000;
const TICK_MS = 120;
const LIVE_WINDOW_MS = 900;

const payloads = new Map();
function uploadPayload(bytes) {
  let p = payloads.get(bytes);
  if (!p) {
    p = 'x'.repeat(bytes);
    payloads.set(bytes, p);
  }
  return p;
}

const bust = () => `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

// Shared meter: counts bytes, reports a short-window live rate for the needle,
// and resolves with the post-warmup average once the window closes.
function createMeter({ durationMs, cancelToken, onTick }) {
  const startedAt = Date.now();
  const samples = [{ t: startedAt, bytes: 0 }];
  const meter = { total: 0, done: false, xhrs: new Set(), lastCountedAt: startedAt };
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
      // End the window at the last byte we actually counted, so data still in
      // flight when the window closes isn't charged as zero-throughput time.
      const secs = Math.max(0.3, (meter.lastCountedAt - from.t) / 1000);
      resolve(Math.max(0, ((meter.total - from.bytes) * 8) / secs / 1e6));
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
    if (!warm && elapsed >= WARMUP_MS) warm = { t: now, bytes: meter.total };
    const first = samples[0];
    const secs = Math.max(0.15, (now - first.t) / 1000);
    onTick?.(((meter.total - first.bytes) * 8) / secs / 1e6, Math.min(1, elapsed / durationMs));
    if (elapsed >= durationMs) meter.stop();
  }, TICK_MS);

  return meter;
}

export function measureDownload(durationMs, cancelToken, onTick) {
  const meter = createMeter({ durationMs, cancelToken, onTick });

  const spawn = () => {
    if (meter.done) return;
    const xhr = new XMLHttpRequest();
    let counted = 0;
    try {
      xhr.responseType = 'blob';
    } catch {
      // falls back to text on platforms without blob support
    }
    xhr.open('GET', `${DOWN_URL}?bytes=${DOWN_CHUNK}&cachebust=${bust()}`);
    xhr.onprogress = (e) => {
      meter.count(e.loaded - counted);
      counted = e.loaded;
    };
    xhr.onload = () => {
      meter.count(DOWN_CHUNK - counted);
      try {
        xhr.response?.close?.();
      } catch {
        // best-effort release of the native blob
      }
      meter.xhrs.delete(xhr);
      spawn();
    };
    xhr.onerror = () => meter.xhrs.delete(xhr);
    xhr.onabort = () => meter.xhrs.delete(xhr);
    meter.xhrs.add(xhr);
    xhr.send();
  };

  for (let i = 0; i < DOWN_STREAMS; i++) spawn();
  return meter.promise;
}

export function measureUpload(durationMs, cancelToken, onTick) {
  const meter = createMeter({ durationMs, cancelToken, onTick });
  let chunkBytes = UP_CHUNK_SMALL;

  const spawn = () => {
    if (meter.done) return;
    const bytes = chunkBytes;
    const sentAt = Date.now();
    const xhr = new XMLHttpRequest();
    let counted = 0;
    xhr.open('POST', `${UP_URL}?cachebust=${bust()}`);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    if (xhr.upload) {
      xhr.upload.onprogress = (e) => {
        meter.count(e.loaded - counted);
        counted = e.loaded;
      };
    }
    xhr.onload = () => {
      meter.count(bytes - counted);
      // a fast link drains small chunks faster than we can queue them
      if (Date.now() - sentAt < 400) chunkBytes = UP_CHUNK_LARGE;
      meter.xhrs.delete(xhr);
      spawn();
    };
    xhr.onerror = () => meter.xhrs.delete(xhr);
    xhr.onabort = () => meter.xhrs.delete(xhr);
    meter.xhrs.add(xhr);
    xhr.send(uploadPayload(bytes));
  };

  for (let i = 0; i < UP_STREAMS; i++) spawn();
  return meter.promise;
}

export async function measureLatency(count, cancelToken, onSample) {
  const times = [];
  for (let i = 0; i < count; i++) {
    if (cancelToken?.cancelled) break;
    const t0 = Date.now();
    try {
      await fetch(`${DOWN_URL}?bytes=0&cachebust=${bust()}`);
      const rtt = Date.now() - t0;
      times.push(rtt);
      onSample?.(rtt, i + 1, count);
    } catch {
      // a dropped ping shouldn't sink the measurement
    }
  }
  if (!times.length) return { latency: 0, jitter: 0 };
  // the first round trip pays for DNS/TLS, so drop it when we can afford to
  const measured = times.length > 2 ? times.slice(1) : times;
  let jitter = 0;
  if (measured.length > 1) {
    let sum = 0;
    for (let i = 1; i < measured.length; i++) sum += Math.abs(measured[i] - measured[i - 1]);
    jitter = sum / (measured.length - 1);
  }
  return { latency: Math.min(...measured), jitter: Math.round(jitter * 10) / 10 };
}

const COLO_CITIES = {
  ISB: 'Islamabad', KHI: 'Karachi', LHE: 'Lahore', DEL: 'Delhi', BOM: 'Mumbai', MAA: 'Chennai',
  BLR: 'Bengaluru', CMB: 'Colombo', DAC: 'Dhaka', KTM: 'Kathmandu', DXB: 'Dubai', DOH: 'Doha',
  RUH: 'Riyadh', KWI: 'Kuwait City', BAH: 'Manama', MCT: 'Muscat', TLV: 'Tel Aviv', IST: 'Istanbul',
  CAI: 'Cairo', JNB: 'Johannesburg', CPT: 'Cape Town', LOS: 'Lagos', NBO: 'Nairobi',
  SIN: 'Singapore', KUL: 'Kuala Lumpur', BKK: 'Bangkok', CGK: 'Jakarta', MNL: 'Manila',
  SGN: 'Ho Chi Minh City', HAN: 'Hanoi', HKG: 'Hong Kong', TPE: 'Taipei', ICN: 'Seoul',
  NRT: 'Tokyo', KIX: 'Osaka', SYD: 'Sydney', MEL: 'Melbourne', PER: 'Perth', AKL: 'Auckland',
  FRA: 'Frankfurt', MUC: 'Munich', DUS: 'Düsseldorf', HAM: 'Hamburg', BER: 'Berlin',
  AMS: 'Amsterdam', BRU: 'Brussels', CDG: 'Paris', MRS: 'Marseille', MAD: 'Madrid',
  BCN: 'Barcelona', LIS: 'Lisbon', MXP: 'Milan', FCO: 'Rome', ZRH: 'Zurich', VIE: 'Vienna',
  PRG: 'Prague', WAW: 'Warsaw', BUD: 'Budapest', OTP: 'Bucharest', SOF: 'Sofia', ATH: 'Athens',
  ARN: 'Stockholm', CPH: 'Copenhagen', OSL: 'Oslo', HEL: 'Helsinki', DUB: 'Dublin',
  LHR: 'London', MAN: 'Manchester', EDI: 'Edinburgh', KBP: 'Kyiv', ALA: 'Almaty', TAS: 'Tashkent',
  IAD: 'Ashburn', EWR: 'Newark', ORD: 'Chicago', DFW: 'Dallas', ATL: 'Atlanta', MIA: 'Miami',
  LAX: 'Los Angeles', SJC: 'San Jose', SEA: 'Seattle', DEN: 'Denver', PHX: 'Phoenix',
  YYZ: 'Toronto', YVR: 'Vancouver', MEX: 'Mexico City', GRU: 'São Paulo', EZE: 'Buenos Aires',
  SCL: 'Santiago', BOG: 'Bogotá', LIM: 'Lima',
};

// The edge actually serving the test — read from the response's CF-RAY colo code.
export async function fetchTestServer() {
  const res = await fetch(`${DOWN_URL}?bytes=0&cachebust=${bust()}`);
  const colo = (res.headers.get('cf-ray') || '').split('-')[1]?.toUpperCase() || '';
  if (!colo) throw new Error('No edge information returned');
  return {
    colo,
    city: COLO_CITIES[colo] || null,
    label: COLO_CITIES[colo] ? `Cloudflare · ${COLO_CITIES[colo]}` : `Cloudflare · ${colo}`,
  };
}
