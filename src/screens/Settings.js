import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import Button from '../components/Button';
import Segmented from '../components/Segmented';
import { Card } from '../components/Card';
import { supabase } from '../lib/supabase';
import { fetchSpeedTestCount } from '../lib/speedTests';

export default function Settings({
  email,
  userId,
  units,
  onUnitsChange,
  autosave,
  onAutosaveChange,
  serverLabel,
  connectionLabel,
  onRefreshNetwork,
  toAuth,
  toOb1,
}) {
  const [testCount, setTestCount] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setTestCount(null);
      return undefined;
    }
    fetchSpeedTestCount(userId)
      .then((c) => !cancelled && setTestCount(c))
      .catch(() => !cancelled && setTestCount(null));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Leave the screen first: a slow network call should never look like a freeze.
  const signOut = () => {
    toAuth();
    supabase.auth.signOut().catch(() => {});
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefreshNetwork();
    } finally {
      setRefreshing(false);
    }
  };

  const initials = email ? email.slice(0, 2).toUpperCase() : 'G';

  return (
    <View className="flex-1 pt-[18px] px-[18px]">
      <Text className="text-[11px] font-o8 tracking-[0.14em] uppercase text-muted1">Setup</Text>
      <Text className="font-o9 text-[36px] leading-[36px] tracking-[-0.045em] text-ink mt-2 mb-4">Settings</Text>

      <Card className="p-[18px] flex-row items-center gap-3.5">
        <View className="w-11 h-11 rounded-full bg-lime items-center justify-center">
          <Text className="text-sm font-o9 text-ink">{initials}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-[15.5px] font-o9 tracking-[-0.02em]">{email || 'Not signed in'}</Text>
          <Text className="text-[11.5px] font-o7 text-muted1 mt-0.5">
            {email
              ? `Signed in${testCount !== null ? ` · ${testCount} test${testCount === 1 ? '' : 's'} saved` : ''}`
              : 'Sign in to sync your history'}
          </Text>
        </View>
        <Button title={email ? 'Sign out' : 'Sign in'} variant="link" onPress={email ? signOut : toAuth} />
      </Card>

      <Card className="p-[18px] mt-3 gap-[18px]">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-[10.5px] font-o8 tracking-[0.12em] uppercase text-muted1">Units</Text>
          <Segmented
            options={[
              { label: 'Mbps', value: 'Mbps' },
              { label: 'MB/s', value: 'MB/s' },
            ]}
            value={units}
            onChange={onUnitsChange}
            optionClassName="py-2 px-4"
          />
        </View>
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-[10.5px] font-o8 tracking-[0.12em] uppercase text-muted1">Save results</Text>
          <Segmented
            options={[
              { label: 'On', value: 'on' },
              { label: 'Off', value: 'off' },
            ]}
            value={autosave ? 'on' : 'off'}
            onChange={(v) => onAutosaveChange(v === 'on')}
            optionClassName="py-2 px-4"
          />
        </View>
      </Card>

      <Card className="p-[18px] mt-3 gap-3.5">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-[10.5px] font-o8 tracking-[0.12em] uppercase text-muted1">Test server</Text>
          <Text className="text-sm font-o8 flex-1 text-right">{serverLabel || 'Finding nearest…'}</Text>
        </View>
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-[10.5px] font-o8 tracking-[0.12em] uppercase text-muted1">Connection</Text>
          <Text className="text-sm font-o8">{connectionLabel || 'Checking…'}</Text>
        </View>
        <Button
          title={refreshing ? 'Refreshing…' : 'Refresh network info'}
          variant="secondary"
          block
          onPress={refresh}
          className="mt-1"
        />
      </Card>

      <Button title="Replay welcome screens" variant="secondary" block onPress={toOb1} className="mt-3" />
      <Text className="text-xs font-o6 text-muted3 mt-3.5">Pingo 0.4.1 · results stored in Supabase</Text>
    </View>
  );
}
