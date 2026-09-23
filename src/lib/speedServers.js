// Choosing which node runs the test, and how to talk to it.
//
// Every backend is wrapped in the same small adapter shape, so the measurement
// engine never learns whether it is talking to one of our boxes or to the
// Cloudflare fallback. Adding a third backend later means adding an adapter
// here and nothing else.

import {
  SPEED_SERVERS,
  DISCOVER_PEERS,
  ALLOW_CLOUDFLARE_FALLBACK,
  SERVER_CACHE_MS,
} from './speedServerConfig';

const bust = () => `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
const trim = (url) => String(url).replace(/\/+$/, '');

// --- adapters -------------------------------------------------------------

function ownServer(entry) {
  const base = trim(entry.url);
  return {
    kind: 'own',
    id: entry.id,
    name: entry.name || entry.id,
    country: entry.country || '',
    label: entry.name || entry.id,
    base,
    pingUrl: () => `${base}/ping?cachebust=${bust()}`,
    downloadUrl: (bytes) => `${base}/download?bytes=${bytes}&cachebust=${bust()}`,
    uploadUrl: () => `${base}/upload?cachebust=${bust()}`,
    infoUrl: () => `${base}/info`,
  };
}

// Cloudflare's public endpoints. Same shape, different query parameters, and
// no /info — the app falls back to its own IP lookup in that case.
function cloudflare(colo) {
  const city = colo ? COLO_CITIES[colo] || colo : null;
  return {
    kind: 'cloudflare',
    id: colo ? `cf-${colo.toLowerCase()}` : 'cf',
    name: city ? `Cloudflare · ${city}` : 'Cloudflare edge',
    country: '',
    label: city ? `Cloudflare · ${city}` : 'Cloudflare edge',
    colo,
    city,
    base: 'https://speed.cloudflare.com',
    pingUrl: () => `https://speed.cloudflare.com/__down?bytes=0&cachebust=${bust()}`,
    downloadUrl: (bytes) => `https://speed.cloudflare.com/__down?bytes=${bytes}&cachebust=${bust()}`,
    uploadUrl: () => `https://speed.cloudflare.com/__up?cachebust=${bust()}`,
    infoUrl: () => null,
  };
}

// --- selection ------------------------------------------------------------

// Three probes each, scored on the fastest one. The minimum is the right
// statistic for "how far away is this": it is the run with the least queueing,
// so it reflects distance rather than whatever else the radio was doing.
const PROBES = 3;
const PROBE_TIMEOUT_MS = 2500;

async function probe(adapter) {
  let best = Infinity;
  for (let i = 0; i < PROBES; i++) {
    const t0 = Date.now();
    try {
      const res = await fetchWithTimeout(adapter.pingUrl(), PROBE_TIMEOUT_MS);
      // The first round trip pays for DNS and the TLS handshake. It still tells
      // us the server is alive, but it is not a latency sample.
      if (i > 0 && res) best = Math.min(best, Date.now() - t0);
    } catch {
      // unreachable on this attempt; other probes may still land
    }
  }
  return best;
}

function fetchWithTimeout(url, ms) {
  return Promise.race([
    fetch(url, { method: 'GET', cache: 'no-store' }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

async function discoverPeers(entries) {
  for (const entry of entries) {
    try {
      const res = await fetchWithTimeout(`${trim(entry.url)}/servers`, PROBE_TIMEOUT_MS);
      const json = await res.json();
      if (Array.isArray(json?.servers) && json.servers.length) return json.servers;
    } catch {
      // try the next seed
    }
  }
  return entries;
}

// Reads the colo out of a CF-RAY header so the fallback can still name the city
// it is testing against.
async function cloudflareAdapter() {
  try {
    const res = await fetchWithTimeout(
      `https://speed.cloudflare.com/__down?bytes=0&cachebust=${bust()}`,
      PROBE_TIMEOUT_MS
    );
    const colo = (res.headers.get('cf-ray') || '').split('-')[1]?.toUpperCase() || '';
    return cloudflare(colo || null);
  } catch {
    return cloudflare(null);
  }
}

let cache = null;
let inflight = null;

// Several things want the server at once on a cold start — the ISP lookup, the
// header label, the test itself. Without this they would each race the whole
// fleet independently and the app would spend its first second pinging.
export function pickBestServer({ force = false } = {}) {
  if (!force && cache && Date.now() - cache.at < SERVER_CACHE_MS) {
    return Promise.resolve(cache.adapter);
  }
  if (inflight) return inflight;
  inflight = select().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function select() {
  let entries = SPEED_SERVERS.filter((s) => s && s.url);
  if (entries.length && DISCOVER_PEERS) {
    const discovered = await discoverPeers(entries);
    // Merge on id so a hand-written name in the config wins over the server's.
    const byId = new Map(discovered.map((s) => [s.id, s]));
    entries.forEach((s) => byId.set(s.id, { ...byId.get(s.id), ...s }));
    entries = [...byId.values()].filter((s) => s && s.url);
  }

  if (entries.length) {
    const scored = await Promise.all(
      entries.map(async (entry) => {
        const adapter = ownServer(entry);
        return { adapter, rtt: await probe(adapter) };
      })
    );
    const reachable = scored.filter((s) => Number.isFinite(s.rtt)).sort((a, b) => a.rtt - b.rtt);
    if (reachable.length) {
      cache = { at: Date.now(), adapter: reachable[0].adapter };
      return cache.adapter;
    }
  }

  if (!ALLOW_CLOUDFLARE_FALLBACK) {
    throw new Error(
      entries.length ? 'No speed-test server reachable' : 'No speed-test servers configured'
    );
  }

  const adapter = await cloudflareAdapter();
  cache = { at: Date.now(), adapter };
  return adapter;
}

export function cachedServer() {
  return cache?.adapter || null;
}

export function clearServerCache() {
  cache = null;
  inflight = null;
}

export const COLO_CITIES = {
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
