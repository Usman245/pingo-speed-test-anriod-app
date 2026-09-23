// Who the caller is and which node answered.
//
// Doing the ISP lookup here instead of in the app has two benefits: the phone
// makes one request instead of two, and the result is cached across every user
// on the same carrier egress, so a free geo API comfortably survives a real
// user base instead of burning its quota in an afternoon.

import { clientIp, sendJson } from '../lib/http.js';
import { config } from '../config.js';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX = 5000;
const LOOKUP_TIMEOUT_MS = 2500;

const cache = new Map();
const inflight = new Map();

function cached(ip) {
  const hit = cache.get(ip);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(ip);
    return null;
  }
  // Refresh insertion order so the eviction below drops the coldest entry.
  cache.delete(ip);
  cache.set(ip, hit);
  return hit.value;
}

function store(ip, value) {
  cache.set(ip, { at: Date.now(), value });
  while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
}

async function lookup(ip) {
  const hit = cached(ip);
  if (hit) return hit;

  // Collapse a thundering herd of first-run clients into one upstream call.
  const pending = inflight.get(ip);
  if (pending) return pending;

  const task = (async () => {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
      headers: { 'User-Agent': 'tom-speed-server' },
    });
    const json = await res.json();
    if (!json?.success) throw new Error(json?.message || 'geo lookup failed');
    const value = {
      isp: json.connection?.isp || json.connection?.org || null,
      org: json.connection?.org || json.connection?.isp || null,
      asn: json.connection?.asn ? `AS${json.connection.asn}` : null,
      city: json.city || null,
      region: json.region || null,
      country: json.country || null,
      countryCode: json.country_code || null,
      latitude: json.latitude ?? null,
      longitude: json.longitude ?? null,
    };
    store(ip, value);
    return value;
  })().finally(() => inflight.delete(ip));

  inflight.set(ip, task);
  return task;
}

export async function handleInfo(req, res) {
  const ip = clientIp(req);
  const body = {
    ip,
    server: {
      id: config.id,
      name: config.name,
      country: config.country,
      sponsor: config.sponsor,
    },
    isp: null,
    org: null,
    asn: null,
    city: null,
    region: null,
    country: null,
  };

  if (config.geoLookup && isPublic(ip)) {
    try {
      Object.assign(body, await lookup(ip));
    } catch {
      // A geo miss must never fail the request — the app still wants the IP
      // and the server identity, and it has its own fallback for the rest.
      body.geoError = true;
    }
  }

  sendJson(req, res, 200, body);
}

// No point asking a public geo API about a LAN address during local testing.
function isPublic(ip) {
  if (!ip || ip === '::1' || ip === '127.0.0.1') return false;
  if (/^10\./.test(ip)) return false;
  if (/^192\.168\./.test(ip)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return false;
  if (/^169\.254\./.test(ip)) return false;
  if (/^(fc|fd|fe80)/i.test(ip)) return false;
  return true;
}
