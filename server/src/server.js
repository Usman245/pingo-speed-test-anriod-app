// Tom speed-test server.
//
// Plain node:http on purpose. This process is a byte pump — the framework layer
// would sit on the hot path of every 256 KB write for no benefit, and the usual
// body-parser default (buffer the request, then hand it to the handler) is
// actively wrong for an endpoint whose whole job is to absorb 100 MB uploads.

import http from 'node:http';
import { config } from './config.js';
import { corsHeaders, sendJson } from './lib/http.js';
import { POOL_SIZE } from './lib/entropy.js';
import { handlePing } from './routes/ping.js';
import { handleDownload } from './routes/download.js';
import { handleUpload } from './routes/upload.js';
import { handleInfo } from './routes/info.js';
import { handleServers } from './routes/servers.js';

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req));
    res.end();
    return;
  }

  switch (path) {
    case '/ping':
      if (isGet(req)) return handlePing(req, res);
      break;
    case '/download':
      if (isGet(req)) return handleDownload(req, res, url);
      break;
    case '/upload':
      if (req.method === 'POST' || req.method === 'PUT') return handleUpload(req, res);
      break;
    case '/info':
      if (isGet(req)) return handleInfo(req, res);
      break;
    case '/servers':
      if (isGet(req)) return handleServers(req, res);
      break;
    case '/health':
    case '/':
      if (isGet(req)) {
        return sendJson(req, res, 200, {
          ok: true,
          server: { id: config.id, name: config.name, country: config.country },
          uptimeSec: Math.round(process.uptime()),
        });
      }
      break;
    default:
      return sendJson(req, res, 404, { error: 'not found' });
  }

  sendJson(req, res, 405, { error: 'method not allowed' });
});

const isGet = (req) => req.method === 'GET' || req.method === 'HEAD';

// Nagle's algorithm holds small writes back for up to 40 ms waiting for company.
// On /ping that is the entire measurement, so it has to go.
server.on('connection', (socket) => {
  socket.setNoDelay(true);
});

// A test re-uses one connection for a dozen sequential chunk requests. If the
// server hangs up between them, every chunk pays for a fresh TCP+TLS handshake
// and the download reads low. Keep connections alive comfortably longer than a
// full test run.
server.keepAliveTimeout = 120_000;
server.headersTimeout = 125_000;

// Node's default 300 s request timeout would kill a slow 100 MB upload from a
// weak cellular link. Raised rather than disabled: with no bound at all, a
// slow-loris body could pin a connection open indefinitely on a public port.
server.requestTimeout = 600_000;

// Large socket buffers so a fast link isn't throttled by a small window while
// the event loop is between ticks.
server.on('listening', () => {
  console.log(
    `[speed] ${config.name} (${config.id}) listening on ${config.host}:${config.port} · ` +
      `${(POOL_SIZE / 1024 / 1024) | 0} MB entropy pool · ` +
      `max down ${(config.maxDownloadBytes / 1024 / 1024) | 0} MB · ` +
      `max up ${(config.maxUploadBytes / 1024 / 1024) | 0} MB`
  );
});

// Listen failures (port taken, no permission) are fatal and deserve a sentence,
// not a stack trace.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[speed] port ${config.port} is already in use`);
  } else if (err.code === 'EACCES') {
    console.error(`[speed] not allowed to bind ${config.host}:${config.port}`);
  } else {
    console.error('[speed] server error', err);
  }
  process.exit(1);
});

// A dropped client mid-download surfaces as ECONNRESET on the socket. That is
// the normal end of a test window, not a crash.
server.on('clientError', (err, socket) => {
  if (!socket.destroyed) socket.destroy();
});

process.on('uncaughtException', (err) => {
  if (err?.code === 'ECONNRESET' || err?.code === 'EPIPE') return;
  console.error('[speed] uncaught', err);
});

server.listen(config.port, config.host);

const shutdown = () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
