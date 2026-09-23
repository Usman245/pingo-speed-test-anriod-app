# Tom speed-test server

The measurement backend for the app. Zero dependencies, plain `node:http`.

Results are only as good as the server they are measured against. A public
endpoint is shared with the rest of the internet, is often far away, and may sit
behind a CDN that caches or compresses the very bytes you are trying to time.
Running your own node removes all three problems, which is why every serious
speed test ships its own servers.

## Endpoints

| Route                  | Method     | Purpose                                                   |
| ---------------------- | ---------- | --------------------------------------------------------- |
| `/ping`                | GET        | Empty 204. The client times the round trip.               |
| `/download?bytes=N`    | GET        | Streams exactly N incompressible bytes.                   |
| `/upload`              | POST       | Drains the body, replies with the byte count and its own timing. |
| `/info`                | GET        | Caller's IP plus ISP/ASN/city, cached server-side.        |
| `/servers`             | GET        | This node and its configured peers, for client-side selection. |
| `/health`              | GET        | Liveness probe.                                           |

## Run it locally

```bash
cd server
cp .env.example .env
npm start
```

Then point the app at it. In `src/lib/speedServerConfig.js`:

```js
export const SPEED_SERVERS = [
  { id: 'dev', name: 'Dev machine', url: 'http://192.168.1.20:8080' },
];
```

Use your machine's LAN IP, not `localhost` — `localhost` on a phone means the
phone. Android release builds also block cleartext HTTP, so a plain-HTTP node
works for `expo run:android` debug builds but needs TLS for anything shipped.

## Deploy

```bash
cd server
cp .env.example .env      # set SERVER_ID / SERVER_NAME / TRUST_PROXY=1
docker compose up -d
```

Then put Nginx in front for TLS, using `nginx/speedtest.conf` as the vhost.
Replace `speed.example.com` and the certificate paths, then:

```bash
sudo certbot --nginx -d speed.example.com
sudo nginx -t && sudo systemctl reload nginx
```

Verify the deployment end to end:

```bash
curl -s https://speed.example.com/health
curl -s -o /dev/null -w '%{speed_download} B/s\n' \
  'https://speed.example.com/download?bytes=104857600'

# The important negative check: the payload must arrive uncompressed.
# Content-Encoding must say identity, never gzip or br.
curl -sI -H 'Accept-Encoding: gzip, br' \
  'https://speed.example.com/download?bytes=1048576' | grep -i content-encoding
```

### Where to host

Bandwidth is the whole product here, so pick on egress cost and network quality,
not CPU. A 2 vCPU box on a 1–10 Gbps unmetered port will saturate any consumer
connection pointed at it. Providers with unmetered ports (Hetzner, OVH, Scaleway)
cost far less than metered cloud egress once you have real users — a single user
running a 10-second test at 100 Mbps moves about 250 MB.

Put a node in each region where you have users. A test against a server 200 ms
away measures the distance, not the connection.

### Multiple nodes

Give each node its own `SERVER_ID`, and list the others in `PEERS`:

```bash
SERVER_ID=lhr
SERVER_NAME=London, UK
PEERS=[{"id":"khi","name":"Karachi, PK","country":"PK","url":"https://khi.speed.example.com"}]
```

The app fetches `/servers` from whichever node it can reach, pings them all, and
keeps the closest. Adding a region is then an env change and a restart, not an
app-store release.

## Things that quietly ruin the numbers

Most of these are already handled in `src/` and in the Nginx config; they are
listed here because they are what to check first when a reading looks wrong.

- **Compression on `/download`.** The single biggest one. Compressed zeros make
  a 50 Mbps link look like 500 Mbps, so the payload is random bytes and the
  response declares `Content-Encoding: identity` with `gzip off` in Nginx.
- **Caching.** A cached response measures your disk. Every route sends
  `no-store` and the client adds a cache-buster.
- **Buffering in the reverse proxy.** Nginx's default is to spool an upload to
  disk before forwarding it, which times your disk rather than the link. Hence
  `proxy_request_buffering off`.
- **Nagle's algorithm.** Up to 40 ms of delay on small writes, which is the
  entire `/ping` measurement. Disabled per socket.
- **Connection churn.** Without upstream keep-alive, every chunk pays for a new
  TCP and TLS handshake and the download reads low.
- **Buffering the upload body in the process.** A body parser with a 100 MB
  limit holds every concurrent upload in RSS at once. The route drains instead.

## Configuration

Every option lives in `.env` — see `.env.example` for the annotated list.
`src/config.js` is the only file that reads `process.env`, so a deployment is
fully described by its env file.
