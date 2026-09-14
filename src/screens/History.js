import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Card } from '../components/Card';
import { HISTORY_SPEEDS, HISTORY_ROWS } from '../data';
import { fetchSpeedTests } from '../lib/speedTests';
import { formatSpeed, speedLabel } from '../lib/format';
import { colors } from '../theme';

function median(nums) {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function formatWhen(iso) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return isToday ? `Today ${time}` : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function History({ userId, units }) {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(!!userId);

  useEffect(() => {
    if (!userId) {
      setRows(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchSpeedTests(userId)
      .then((data) => !cancelled && setRows(data))
      .catch(() => !cancelled && setRows([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const usingRemote = !!userId && rows !== null;
  const speeds = usingRemote ? rows.map((r) => Number(r.download_mbps)) : HISTORY_SPEEDS;
  const tableRows = usingRemote
    ? rows.map((r) => ({
        when: formatWhen(r.created_at),
        down: formatSpeed(Number(r.download_mbps), units),
        up: formatSpeed(Number(r.upload_mbps), units),
        ping: `${Number(r.latency_ms).toFixed(0)} ms`,
      }))
    : HISTORY_ROWS.map((h) => ({
        ...h,
        down: formatSpeed(Number(h.down), units),
        up: formatSpeed(Number(h.up), units),
      }));
  const maxSpeed = Math.max(1, ...speeds);
  const med = median(speeds);

  return (
    <View className="flex-1 pt-[18px] px-[18px]">
      <Text className="text-[11px] font-o8 tracking-[0.14em] uppercase text-muted1">History</Text>
      <Text className="font-o9 text-[36px] leading-[36px] tracking-[-0.045em] text-ink mt-2 mb-3.5">
        {usingRemote ? `Last ${speeds.length} tests` : 'Last 12 tests'}
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.ink} className="my-8" />
      ) : speeds.length === 0 ? (
        <Text className="text-muted1 text-sm font-o6 my-8">No tests yet — run one from the Test tab.</Text>
      ) : (
        <>
          <Card className="p-[18px]">
            <View className="flex-row items-baseline justify-between">
              <Text className="text-[10.5px] font-o8 tracking-[0.12em] uppercase text-muted1">
                Download · {speedLabel(units)}
              </Text>
              <Text className="text-[12.5px] font-o8">Median {formatSpeed(med, units)}</Text>
            </View>
            <View className="flex-row items-end gap-1.5 mt-3.5" style={{ height: 110 }}>
              {speeds.map((v, i) => (
                <View
                  key={i}
                  className={`flex-1 rounded ${i >= speeds.length - 2 ? 'bg-lime' : 'bg-track'}`}
                  style={{ height: `${26 + (v / maxSpeed) * 74}%` }}
                />
              ))}
            </View>
            <View className="flex-row justify-between mt-2">
              <Text className="text-[10.5px] font-o8 tracking-[0.1em] uppercase text-muted3">
                {usingRemote ? 'Oldest' : 'Aug 30'}
              </Text>
              <Text className="text-[10.5px] font-o8 tracking-[0.1em] uppercase text-muted3">Today</Text>
            </View>
          </Card>
          <Card className="py-1 px-[18px] mt-3">
            {tableRows.map((h, i) => (
              <View key={i} className={`flex-row items-baseline gap-2.5 py-3.5 ${i < tableRows.length - 1 ? 'border-b border-b-track' : ''}`}>
                <Text className="flex-1 text-[13.5px] font-o7 text-muted2">{h.when}</Text>
                <Text className="text-base font-o9 tracking-[-0.02em]">{h.down}</Text>
                <Text className="text-xs font-o7 text-muted3" style={{ width: 56, textAlign: 'right' }}>↑ {h.up}</Text>
                <Text className="text-xs font-o7 text-muted3" style={{ width: 48, textAlign: 'right' }}>{h.ping}</Text>
              </View>
            ))}
          </Card>
        </>
      )}

      {!userId ? (
        <Text className="text-xs font-o6 text-muted1 mt-4">
          Sample data — sign in from Settings to sync your own history.
        </Text>
      ) : null}
    </View>
  );
}
