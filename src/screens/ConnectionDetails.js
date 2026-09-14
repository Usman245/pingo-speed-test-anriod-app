import { View, Text } from 'react-native';
import Button from '../components/Button';
import { Card } from '../components/Card';

export default function ConnectionDetails({ proxy, connectionLabel, serverLabel, toTest, toProxy }) {
  const [isp, location] = (proxy.sub || '').split(' · ');
  const rows = [
    { k: 'IP address', v: proxy.ip },
    { k: 'ISP', v: isp || '—' },
    { k: 'Location', v: location || '—' },
    { k: 'Connection', v: connectionLabel || 'Checking…' },
    { k: 'Route', v: proxy.id === 'direct' ? 'Direct' : 'Proxy · this app only' },
    { k: 'Test server', v: serverLabel || 'Finding nearest…' },
    { k: 'ASN', v: proxy.asn || (proxy.id === 'direct' ? '—' : 'AS24940') },
  ];

  return (
    <View className="flex-1 pt-[18px] px-[18px]">
      <Text className="text-[11px] font-o8 tracking-[0.14em] uppercase text-muted1">Connection</Text>
      <Text className="font-o9 text-[36px] leading-[36px] tracking-[-0.045em] text-ink mt-2 mb-1">{proxy.ip}</Text>
      <Text className="text-[13.5px] font-o7 text-muted2 mb-4">{proxy.sub}</Text>
      <Card className="rounded-[26px] py-1 px-[18px]">
        {rows.map((r, i) => (
          <View key={r.k} className={`flex-row items-baseline justify-between gap-3 py-3.5 ${i < rows.length - 1 ? 'border-b border-b-track' : ''}`}>
            <Text className="text-[10.5px] font-o8 tracking-[0.12em] uppercase text-muted1">{r.k}</Text>
            <Text className="text-[15px] font-o8 tracking-[-0.01em] text-right">{r.v}</Text>
          </View>
        ))}
      </Card>
      <View className="flex-row gap-2.5 mt-4">
        <Button title="Run a test" variant="secondary" onPress={toTest} className="flex-1" />
        <Button title="Change route" variant="primary" onPress={toProxy} className="flex-1" />
      </View>
      <Text className="text-xs font-o6 text-muted1 mt-3.5">
        Location is approximate — resolved from the IP, not from the device.
      </Text>
    </View>
  );
}
