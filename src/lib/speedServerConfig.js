// The one file to edit after deploying `server/`.
//
// Fill SPEED_SERVERS with your own nodes. Everything else in the app reads the
// chosen server from here, so no other file needs to change when you add a
// region or move a box.

// A seed is the entry point to your fleet, not a fixed test location. The app
// asks this node for `/servers`, then races every returned node and measures
// against the fastest reachable one. Put one or more public HTTPS URLs in:
//
// EXPO_PUBLIC_SPEEDTEST_SEED_URLS=https://isb.example.com,https://khi.example.com
//
// `EXPO_PUBLIC_*` values are embedded by Expo at build time, so this is safe
// for public server URLs but never put a secret in it.
const seedUrls = (process.env.EXPO_PUBLIC_SPEEDTEST_SEED_URLS || '')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

export const SPEED_SERVERS = seedUrls.map((url, index) => ({
  id: `seed-${index + 1}`,
  name: 'Pingo test server',
  url,
}));

// Ask the first reachable node for the rest of the fleet, so adding a region is
// a server env change rather than an app release. Harmless when the list above
// has a single entry.
export const DISCOVER_PEERS = true;

// Until your own nodes are live — and any time all of them are unreachable —
// fall back to Cloudflare's public edge so the app still measures something.
// Readings from it are noisier and shared with the rest of the internet, which
// is the reason you are standing up your own servers. Set to false to make an
// outage visible instead of silently degrading.
export const ALLOW_CLOUDFLARE_FALLBACK = true;

// How long a chosen server stays chosen before the app re-races the fleet.
export const SERVER_CACHE_MS = 10 * 60 * 1000;
