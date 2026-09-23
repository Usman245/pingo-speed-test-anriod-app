// Header helpers shared by every route.

import { config } from '../config.js';

// A React Native fetch/XHR sends no Origin header at all, so the common case
// here is `origin === undefined` and CORS never enters the picture. These
// headers exist for the web build and for debugging from a browser.
export function corsHeaders(req) {
  const origin = req.headers.origin;
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Content-Length, Cache-Control',
    'Access-Control-Max-Age': '86400',
    // Without this the browser blanks out Resource Timing for cross-origin
    // requests, which is exactly the data a web speed test needs.
    'Timing-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'Content-Length, Server-Timing, X-Server-Id',
  };

  if (config.allowAnyOrigin) {
    headers['Access-Control-Allow-Origin'] = '*';
  } else if (origin && config.allowedOrigins.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
  }

  return headers;
}

// Caches are the enemy of a speed test: a 200 Mbps reading taken from a local
// cache hit is not a reading at all. Belt and braces across HTTP/1.0 proxies,
// HTTP/1.1 caches and CDNs.
export const NO_CACHE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
  'CDN-Cache-Control': 'no-store',
};

export function clientIp(req) {
  if (config.trustProxy) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const first = String(forwarded).split(',')[0].trim();
      if (first) return normalise(first);
    }
    const real = req.headers['x-real-ip'];
    if (real) return normalise(String(real).trim());
  }
  return normalise(req.socket.remoteAddress || '');
}

// Node reports IPv4 sockets as ::ffff:1.2.3.4 when the listener is dual-stack.
function normalise(ip) {
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

export function sendJson(req, res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    ...corsHeaders(req),
    ...NO_CACHE,
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'X-Server-Id': config.id,
  });
  res.end(payload);
}
