import { pickBestServer } from './speedServers';

// Where the IP/ISP details come from, in order of preference:
//
//  1. The chosen speed-test server's /info. It already knows the caller's IP
//     from the socket, and it caches the ISP lookup across every user on the
//     same carrier egress — so a free geo API survives a real user base
//     instead of burning its quota in an afternoon.
//  2. ipwho.is directly, for the Cloudflare fallback and for any moment your
//     own nodes are unreachable.
export async function fetchIpInfo() {
  try {
    const server = await pickBestServer();
    const url = server.infoUrl?.();
    if (url) {
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      if (json?.ip) return normalise(json);
    }
  } catch {
    // fall through to the public lookup
  }

  const res = await fetch('https://ipwho.is/');
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'IP lookup failed');
  return normalise({
    ip: json.ip,
    isp: json.connection?.isp || json.connection?.org,
    org: json.connection?.org || json.connection?.isp,
    asn: json.connection?.asn ? `AS${json.connection.asn}` : null,
    city: json.city,
    region: json.region,
    country: json.country,
  });
}

// Both sources are shaped the same by the time they get here; this only fills
// the gaps so the screens never have to render `null`.
function normalise(data) {
  return {
    ip: data.ip,
    isp: data.isp || data.org || 'Unknown ISP',
    org: data.org || data.isp || 'Unknown',
    asn: data.asn || '—',
    city: data.city || '',
    region: data.region || '',
    country: data.country || '',
  };
}
