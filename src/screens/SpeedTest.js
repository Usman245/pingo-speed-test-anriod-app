import { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import Button from '../components/Button';
import { Card } from '../components/Card';
import RingGauge from '../components/RingGauge';
import Sparkline from '../components/Sparkline';
import {
  measureLatency,
  measureDownload,
  measureUpload,
  pickBestServer,
  WARMUP_MS,
} from '../lib/speedTestEngine';
import { speedToRing, formatSpeed, speedLabel } from '../lib/format';

const PING_SAMPLES = 10;
// 1s of warm-up is discarded inside the engine, so each phase measures 10s.
const PHASE_MS = WARMUP_MS + 10000;
// The engine ticks ~8x a second. Re-rendering this screen that often janks a
// mid-range phone, so text redraws at 5Hz and the ring sweeps via Animated.
const FRAME_MS = 200;
const MAX_SAMPLES = 24;
// A sweep outlasts the gap between engine ticks and eases linearly, so each
// one is still in motion when the next re-aims it: the needle reads as one
// continuous motion instead of restarting an ease curve 8 times a second.
const SWEEP_MS = 200;

const SAVE_LABEL = {
  saving: 'Saving…',
  saved: 'Saved to history',
  error: 'Could not save — kept locally',
  local: 'Not saved · no account',
};

const STEP_LABEL = {
  connect: 'Choosing the closest server…',
  latency: 'Measuring latency…',
  download: 'Step 1 of 2 · download',
  upload: 'Step 2 of 2 · upload',
};

function headerNow() {
  const d = new Date();
  const day = d.toLocaleDateString([], { weekday: 'long' });
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function SpeedTest({
  phase,
  onStart,
  onCancel,
  onReset,
  onDone,
  routeName,
  routeIp,
  routeSub,
  toDetails,
  toProxy,
  result,
  saveStatus,
  percentile,
  avatarInitials,
  units,
  serverLabel,
  ispName,
  connectionLabel,
  deviceName,
}) {
  const [now] = useState(headerNow);
  const [sub, setSub] = useState('idle');
  const [error, setError] = useState(null);
  const [node, setNode] = useState(null);
  const [ui, setUi] = useState({ value: 0, pct: 0, samples: [] });
  const [live, setLive] = useState({ download: null, upload: null, ping: null, jitter: null });

  const ring = useRef(new Animated.Value(0)).current;
  const targetRef = useRef(0);
  const displayRef = useRef(0);
  const progressRef = useRef(0);
  const samplesRef = useRef([]);

  const animateRing = (toValue, duration, easing) => {
    Animated.timing(ring, { toValue, duration, easing, useNativeDriver: false }).start();
  };
  const sweepTo = (value) => animateRing(speedToRing(value), SWEEP_MS, Easing.linear);

  // One timer drives every text update on this screen.
  useEffect(() => {
    if (phase !== 'running') return undefined;
    const id = setInterval(() => {
      displayRef.current += (targetRef.current - displayRef.current) * 0.5;
      const arr = samplesRef.current;
      arr.push(displayRef.current);
      if (arr.length > MAX_SAMPLES) arr.shift();
      setUi({ value: displayRef.current, pct: Math.round(progressRef.current * 100), samples: arr.slice() });
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === 'idle') {
      setSub('idle');
      setError(null);
      setLive({ download: null, upload: null, ping: null, jitter: null });
      targetRef.current = 0;
      displayRef.current = 0;
      progressRef.current = 0;
      samplesRef.current = [];
      setUi({ value: 0, pct: 0, samples: [] });
      animateRing(0, 260, Easing.out(Easing.quad));
      return undefined;
    }

    if (phase === 'done') {
      // The final reading settles rather than tracking: one slower sweep that
      // eases into the result, instead of the linear chase used while live.
      if (result) animateRing(speedToRing(result.download), 700, Easing.out(Easing.cubic));
      return undefined;
    }

    const cancelToken = { cancelled: false };
    const reset = (next) => {
      setSub(next);
      targetRef.current = 0;
      displayRef.current = 0;
      progressRef.current = 0;
      samplesRef.current = [];
      // Drop back to zero on the way into a phase rather than snapping, so
      // handing over from download to upload reads as one movement.
      animateRing(0, 320, Easing.out(Easing.quad));
    };
    const onTick = (value, p) => {
      if (cancelToken.cancelled) return;
      targetRef.current = value;
      progressRef.current = p;
      sweepTo(value);
    };

    (async () => {
      try {
        // Races the configured fleet and keeps the closest node. The result is
        // cached for a few minutes, so a repeat test starts measuring at once.
        reset('connect');
        // Keep the connection state visible long enough to reassure the user
        // that a real server race is taking place, even on a warm cache.
        const [server] = await Promise.all([pickBestServer(), wait(850)]);
        if (cancelToken.cancelled) return;
        setNode(server);

        // Latency runs on its own, before any bulk data moves, and never takes
        // over the dial — only the step bar advances. Sampling it underneath a
        // saturated download would report queuing delay rather than the path,
        // and would steal throughput from the reading it runs alongside.
        reset('latency');
        const ping = await measureLatency(server, PING_SAMPLES, cancelToken, (_rtt, taken) => {
          if (cancelToken.cancelled) return;
          progressRef.current = taken / PING_SAMPLES;
        });
        if (cancelToken.cancelled) return;
        setLive((l) => ({ ...l, ping: ping.latency, jitter: ping.jitter }));

        reset('download');
        const download = await measureDownload(server, PHASE_MS, cancelToken, onTick);
        if (cancelToken.cancelled) return;
        setLive((l) => ({ ...l, download: download.mbps }));

        reset('upload');
        const upload = await measureUpload(server, PHASE_MS, cancelToken, onTick);
        if (cancelToken.cancelled) return;
        setLive((l) => ({ ...l, upload: upload.mbps }));

        onDone({
          download: download.mbps,
          upload: upload.mbps,
          latency: ping.latency,
          jitter: ping.jitter,
          loss: ping.loss,
          // Kept alongside the averages: the best sustained second of each
          // phase, which is what a burst-friendly link is actually capable of.
          downloadPeak: download.peakMbps,
          uploadPeak: upload.peakMbps,
          serverId: server.id,
          serverName: server.label,
        });
      } catch (e) {
        if (cancelToken.cancelled) return;
        setError(e?.message || 'Test failed');
        onCancel?.();
      }
    })();

    return () => {
      cancelToken.cancelled = true;
    };
  }, [phase]);

  const running = phase === 'running';
  const done = phase === 'done';
  const uploading = running && sub === 'upload';
  const measuring = running && (sub === 'download' || sub === 'upload');

  const bigValue = running
    ? formatSpeed(ui.value, units)
    : done && result
      ? formatSpeed(result.download, units)
      : formatSpeed(0, units);
  const bigUnit = speedLabel(units);
  const centreLabel = uploading ? 'Upload' : 'Download';

  const metrics = uploading
    ? [
        { k: 'Download', v: live.download !== null ? formatSpeed(live.download, units) : '—' },
        { k: 'Ping', v: live.ping !== null ? String(live.ping) : '—' },
        { k: 'Jitter', v: live.jitter !== null ? live.jitter.toFixed(1) : '—' },
      ]
    : [
        {
          k: 'Upload',
          v: done && result
            ? formatSpeed(result.upload, units)
            : live.upload !== null
              ? formatSpeed(live.upload, units)
              : '—',
        },
        { k: 'Ping', v: done && result ? String(result.latency) : live.ping !== null ? String(live.ping) : '—' },
        {
          k: 'Jitter',
          v: done && result ? result.jitter.toFixed(1) : live.jitter !== null ? live.jitter.toFixed(1) : '—',
        },
      ];

  const activeServer = node?.label || serverLabel || 'nearest server';
  const serverPlace = node?.city || node?.name || serverLabel || 'Selecting server';
  const pillText = error
    ? error
    : sub === 'connect' && running
      ? 'Finding the closest server…'
      : sub === 'latency' && running
        ? 'Checking latency…'
        : running
          ? `${uploading ? 'Upload' : 'Download'} · ${activeServer}`
          : done
            ? percentile !== null
              ? `Faster than ${percentile}% of your tests`
              : 'Test complete'
            : 'Tap start when ready';

  return (
    <View className="flex-1 pt-[18px] px-[18px]">
      <View className="flex-row items-center justify-between mb-3.5">
        <View>
          <Text className="text-[11px] font-o8 tracking-[0.14em] uppercase text-muted1">{now}</Text>
          <Text className="font-o9 text-2xl tracking-[-0.03em] text-ink mt-0.5">Your connection</Text>
        </View>
        <View className="w-10 h-10 rounded-full bg-card shadow-sm shadow-ink/10 items-center justify-center">
          <Text className="text-[13px] font-o9 text-ink">{avatarInitials}</Text>
        </View>
      </View>

      <Card className="p-5 pt-5 pb-4 items-center">
        <View className={`self-center py-1.5 px-3.5 rounded-full ${done ? 'bg-lime' : 'bg-bg'}`}>
          <Text className="text-[11.5px] font-o8 text-ink">{pillText}</Text>
        </View>

        <View className="relative mt-2" style={{ width: 230, height: 230 }}>
          <RingGauge progress={ring} />
          <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
            <Text className="text-[11.5px] font-o8 tracking-[0.16em] uppercase text-muted1">{centreLabel}</Text>
            <Text className="font-o9 text-[64px] leading-[65px] tracking-[-0.05em] text-ink">{bigValue}</Text>
            <Text className="text-[13px] font-o8 text-muted1">{bigUnit}</Text>
          </View>
        </View>

        {measuring ? (
          <View className="w-full mt-1 mb-1">
            <Sparkline samples={ui.samples} />
          </View>
        ) : null}

        <View className="flex-row w-full mt-0.5">
          {metrics.map((m, i) => (
            <View key={m.k} className={`flex-1 items-center ${i > 0 ? 'border-l border-l-track' : ''}`}>
              <Text className="text-[10.5px] font-o8 tracking-[0.12em] uppercase text-muted1">{m.k}</Text>
              <Text className="text-[22px] font-o9 tracking-[-0.03em] mt-0.5">{m.v}</Text>
            </View>
          ))}
        </View>
      </Card>

      {running ? (
        <>
          <Card className="rounded-[24px] shadow-sm shadow-ink/[0.07] py-4 px-[18px] mt-3.5">
            <View className="flex-row justify-between items-baseline">
              <Text className="text-[11px] font-o8 tracking-[0.12em] uppercase text-muted1">{STEP_LABEL[sub]}</Text>
              <Text className="text-[13px] font-o9 text-ink">{ui.pct}%</Text>
            </View>
            <View className="h-1.5 rounded-full bg-track mt-2.5 overflow-hidden">
              <View className="h-1.5 rounded-full bg-lime" style={{ width: `${ui.pct}%` }} />
            </View>
          </Card>
          <Button title="Cancel" variant="secondary" block onPress={onCancel} className="mt-3" />
        </>
      ) : (
        <>
          <View className="flex-row gap-3 mt-3.5">
            <Card className="flex-1 p-4">
              <Text className="text-[10.5px] font-o8 tracking-[0.12em] uppercase text-muted1">Visible IP</Text>
              <Text className="text-[15px] font-o9 tracking-[-0.02em] mt-1">{routeIp}</Text>
              <Text className="text-[11.5px] font-o7 text-muted1 mt-1.5">{routeSub}</Text>
            </Card>
            <Card onPress={toProxy} className="flex-1 bg-ink p-4 justify-between">
              <View>
                <Text className="text-[10.5px] font-o8 tracking-[0.12em] uppercase text-lime">Route</Text>
                <Text className="text-[15px] font-o9 tracking-[-0.02em] text-bg mt-1">{routeName}</Text>
              </View>
              <View className="flex-row items-center justify-between mt-2.5">
                <Text className="text-[11px] font-o7 text-bg/75">App only</Text>
                <View className="w-[42px] h-6 rounded-full bg-white/20 p-[3px] items-start">
                  <View className="w-[18px] h-[18px] rounded-full bg-bg" />
                </View>
              </View>
            </Card>
          </View>
          <Button
            title={done ? 'Test again' : 'Start test'}
            variant="primary"
            block
            onPress={done ? onReset : onStart}
            className="mt-4"
          />
        </>
      )}

      {done ? (
        <>
          <Card className="mt-3.5 px-4 py-3.5">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-[10.5px] font-o8 tracking-[0.12em] uppercase text-muted1">Your network</Text>
                <Text numberOfLines={1} className="text-[16px] font-o9 tracking-[-0.02em] mt-1 text-ink">{ispName || 'Looking up provider'}</Text>
                <Text numberOfLines={1} className="text-[11.5px] font-o7 text-muted1 mt-1">{connectionLabel || 'Network'} · {deviceName || 'This device'}</Text>
              </View>
              <View className="w-px h-10 bg-track" />
              <View className="flex-1 pl-3">
                <Text className="text-[10.5px] font-o8 tracking-[0.12em] uppercase text-muted1">Test server</Text>
                <Text numberOfLines={1} className="text-[16px] font-o9 tracking-[-0.02em] mt-1 text-ink">{activeServer}</Text>
                <Text numberOfLines={1} className="text-[11.5px] font-o7 text-muted1 mt-1">{serverPlace}</Text>
              </View>
            </View>
          </Card>
          <View className="flex-row items-center justify-between mt-3 px-1">
            <Text className="text-xs font-o7 text-muted1">{SAVE_LABEL[saveStatus] || SAVE_LABEL.local}</Text>
            <Button title="Connection details" variant="link" onPress={toDetails} />
          </View>
        </>
      ) : null}
    </View>
  );
}
