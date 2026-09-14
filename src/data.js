// 'direct' has no ip/sub here — it's filled in at runtime from the real
// IP/ISP lookup (src/lib/ipInfo.js). The others are illustrative-only: this
// app doesn't actually re-route traffic through them (that needs a native
// SOCKS5/HTTP proxy module), so their IPs/hosts are just for the UI demo.
export const PROXIES = [
  { id: 'direct', name: 'Direct connection', host: 'No proxy', rtt: '—', ip: null, sub: null },
  { id: 'fra', name: 'Frankfurt · DE', host: 'SOCKS5 · 203.0.113.24:1080', rtt: '19 ms', ip: '203.0.113.24', sub: 'Hetzner Online · Frankfurt, DE' },
  { id: 'sin', name: 'Singapore · SG', host: 'SOCKS5 · 198.51.100.7:1080', rtt: '181 ms', ip: '198.51.100.7', sub: 'DigitalOcean · Singapore, SG' },
  { id: 'dal', name: 'Dallas · US', host: 'HTTP · 192.0.2.55:8080', rtt: '118 ms', ip: '192.0.2.55', sub: 'Vultr · Dallas, TX, US' },
];

export const HISTORY_SPEEDS = [72, 88, 61, 94, 40, 83, 96, 91, 55, 88, 102, 94.2];

export const HISTORY_ROWS = [
  { when: 'Today 9:30', down: '94.2', up: '31.6', ping: '14 ms' },
  { when: 'Today 8:02', down: '102', up: '33.1', ping: '12 ms' },
  { when: 'Yesterday', down: '88.0', up: '30.4', ping: '15 ms' },
  { when: 'Sep 10', down: '55.3', up: '21.8', ping: '28 ms' },
  { when: 'Sep 9', down: '91.4', up: '31.0', ping: '14 ms' },
];
