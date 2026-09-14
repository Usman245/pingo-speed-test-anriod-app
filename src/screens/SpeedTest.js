import { useEffect, useRef, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import Button from '../components/Button';
import { Card } from '../components/Card';
import RingGauge from '../components/RingGauge';
import Sparkline from '../components/Sparkline';
import { measureLatency, measureDownload, measureUpload, WARMUP_MS } from '../lib/speedTestEngine';
import { speedToRing, formatSpeed, speedLabel } from '../lib/format';

const PING_SAMPLES = 6;
// 1s of warm-up is discarded inside the engine, so each phase measures ~6s.
const PHASE_MS = WARMUP_MS + 6000;
// The engine ticks ~8x a second. Re-rendering this screen that often janks a
// mid-range phone, so text redraws at 5Hz and the ring sweeps via Animated.
const FRAME_MS = 200;
const MAX_SAMPLES = 24;

const SAVE_LABEL = {
  saving: 'Saving…',
  saved: 'Saved to history',
  error: 'Could not save — kept locally',
  local: 'Not saved · no account',
};

const STEP_LABEL = {
  ping: 'Step 1 of 3 · ping',
  download: 'Step 2 of 3 · download',
  upload: 'Step 3 of 3 · upload',
};

function headerNow() {
  const d = new Date();
  const day = d.toLocaleDateString([], { weekday: 'long' });
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
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
}) {
  const [now] = useState(headerNow);
  const [sub, setSub] = useState('idle');
  const [ui, setUi] = useState({ value: 0, pct: 0, samples: [] });
  const [live, setLive] = useState({ download: null, upload: null, ping: null, jitter: null });

  const ring = useRef(new Animated.Value(0)).current;
  const targetRef = useRef(0);
  const displayRef = useRef(0);
  const progressRef = useRef(0);
  const samplesRef = useRef([]);

  const sweepTo = (value) => {
    Animated.timing(ring, {
      toValue: speedToRing(value),
      duration: 220,
      useNativeDriver: false,
    }).start();
  };

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
      setLive({ download: null, upload: null, ping: null, jitter: null });
      targetRef.current = 0;
      displayRef.current = 0;
      progressRef.current = 0;
      samplesRef.current = [];
      setUi({ value: 0, pct: 0, samples: [] });
      Animated.timing(ring, { toValue: 0, duration: 260, useNativeDriver: false }).start();
      return undefined;
    }

    if (phase === 'done') {
      if (result) sweepTo(result.download);
      return undefined;
    }

    const cancelToken = { cancelled: false };
    const reset = (next) => {
      setSub(next);
      targetRef.current = 0;
      displayRef.current = 0;
      progressRef.current = 0;
      samplesRef.current = [];
      ring.setValue(0);
    };
    const onTick = (value, p) => {
      if (cancelToken.cancelled) return;
      targetRef.current = value;
      progressRef.current = p;
      sweepTo(value);
    };

    (async () => {
      reset('ping');
      const ping = await measureLatency(PING_SAMPLES, cancelToken, (rtt, i) => {
        if (cancelToken.cancelled) return;
        targetRef.current = rtt;
        progressRef.current = i / PING_SAMPLES;
      });
      if (cancelToken.cancelled) return;
      setLive((l) => ({ ...l, ping: ping.latency, jitter: ping.jitter }));

      reset('download');
      const download = await measureDownload(PHASE_MS, cancelToken, onTick);
      if (cancelToken.cancelled) return;
      setLive((l) => ({ ...l, download }));

      reset('upload');
      const upload = await measureUpload(PHASE_MS, cancelToken, onTick);
      if (cancelToken.cancelled) return;
      setLive((l) => ({ ...l, upload }));

      onDone({ download, upload, latency: ping.latency, jitter: ping.jitter, loss: 0 });
    })();

    return () => {
      cancelToken.cancelled = true;
    };
  }, [phase]);

  const running = phase === 'running';
  const done = phase === 'done';
  const pinging = running && sub === 'ping';
  const uploading = running && sub === 'upload';

  const bigValue = pinging
    ? String(Math.round(ui.value))
    : running
      ? formatSpeed(ui.value, units)
      : done && result
        ? formatSpeed(result.download, units)
        : formatSpeed(0, units);
  const bigUnit = pinging ? 'ms' : speedLabel(units);
  const centreLabel = pinging ? 'Ping' : uploading ? 'Upload' : 'Download';

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

  const pillText = pinging
    ? 'Measuring ping…'
    : running
      ? `${uploading ? 'Upload' : 'Download'} · ${serverLabel || 'nearest edge'}`
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
          <View className="absolute inset-0 items-center justify-center">
            <Text className="text-[11.5px] font-o8 tracking-[0.16em] uppercase text-muted1">{centreLabel}</Text>
            <Text className="font-o9 text-[64px] leading-[65px] tracking-[-0.05em] text-ink">{bigValue}</Text>
            <Text className="text-[13px] font-o8 text-muted1">{bigUnit}</Text>
          </View>
        </View>

        {running && !pinging ? (
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
        <View className="flex-row items-center justify-between mt-3 px-1">
          <Text className="text-xs font-o7 text-muted1">{SAVE_LABEL[saveStatus] || SAVE_LABEL.local}</Text>
          <Button title="Connection details" variant="link" onPress={toDetails} />
        </View>
      ) : null}
    </View>
  );
}
