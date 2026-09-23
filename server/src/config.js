// Every knob the server has, resolved once at boot. Nothing below reads
// process.env directly, so a deployment is fully described by its env file.

const int = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const bool = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  return /^(1|true|yes|on)$/i.test(String(value));
};

const json = (value, fallback) => {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    console.warn('[config] PEERS is not valid JSON — ignoring it');
    return fallback;
  }
};

const origins = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export const config = {
  port: int(process.env.PORT, 8080),
  host: process.env.HOST || '0.0.0.0',

  id: process.env.SERVER_ID || 'local',
  name: process.env.SERVER_NAME || 'Local server',
  country: process.env.SERVER_COUNTRY || '',
  sponsor: process.env.SERVER_SPONSOR || 'Tom',

  maxDownloadBytes: int(process.env.MAX_DOWNLOAD_BYTES, 1024 * 1024 * 1024),
  maxUploadBytes: int(process.env.MAX_UPLOAD_BYTES, 256 * 1024 * 1024),
  defaultDownloadBytes: 25 * 1024 * 1024,

  trustProxy: bool(process.env.TRUST_PROXY, false),
  allowAnyOrigin: origins.includes('*'),
  allowedOrigins: new Set(origins),

  geoLookup: bool(process.env.GEO_LOOKUP, true),
  peers: json(process.env.PEERS, []),
};
