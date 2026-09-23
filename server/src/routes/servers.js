// The fleet, as this node understands it.
//
// The app pings every entry and keeps the closest, so adding a node in a new
// region is an env change and a restart — not an app-store release.

import { sendJson } from '../lib/http.js';
import { config } from '../config.js';

export function handleServers(req, res) {
  const self = {
    id: config.id,
    name: config.name,
    country: config.country,
    sponsor: config.sponsor,
    url: selfUrl(req),
  };

  const peers = config.peers
    .filter((p) => p && p.url && p.id !== config.id)
    .map((p) => ({
      id: p.id,
      name: p.name || p.id,
      country: p.country || '',
      sponsor: p.sponsor || config.sponsor,
      url: String(p.url).replace(/\/+$/, ''),
    }));

  sendJson(req, res, 200, { servers: [self, ...peers] });
}

function selfUrl(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (!host) return '';
  // Behind Nginx the forwarded header is authoritative. Without it we are being
  // hit directly, which in practice only happens in local development.
  const proto = req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http');
  return `${proto}://${host}`;
}
