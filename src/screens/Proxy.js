import { View, Text, Pressable } from 'react-native';
import Tag from '../components/Tag';
import { colors } from '../theme';

export default function Proxy({ proxyId, proxies, onSelect, routeIp, toAdd }) {
  return (
    <View className="flex-1 pt-[18px] px-[18px]">
      <Text className="text-[11px] font-o8 tracking-[0.14em] uppercase text-muted1">Route</Text>
      <Text className="font-o9 text-[36px] leading-[36px] tracking-[-0.045em] text-ink mt-2 mb-1">{routeIp}</Text>
      <Text className="text-[13.5px] font-o7 text-muted2 mb-4">Visible IP · routes this app's traffic only</Text>
      <View className="gap-2.5">
        {proxies.map((p) => {
          const active = p.id === proxyId;
          return (
            <Pressable
              key={p.id}
              onPress={() => onSelect(p.id)}
              className="bg-card rounded-[24px] shadow-sm shadow-ink/[0.07] py-[15px] px-4 flex-row items-center gap-3.5"
              style={{ borderWidth: 2, borderColor: active ? colors.ink : 'transparent' }}
            >
              <View
                className="w-[22px] h-[22px] rounded-full items-center justify-center"
                style={{ borderWidth: 2.5, borderColor: active ? colors.ink : colors.proxyDotBorder, backgroundColor: active ? colors.lime : colors.card }}
              />
              <View className="flex-1">
                <Text className="text-[15.5px] font-o9 tracking-[-0.02em]">{p.name}</Text>
                <Text className="text-[11.5px] font-o7 text-muted1 mt-0.5">{p.host}</Text>
              </View>
              <View className="items-end">
                <Text className="text-[13px] font-o9">{p.rtt}</Text>
                {active ? <Tag label="Active" className="mt-1" /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        onPress={toAdd}
        className="mt-3.5 py-[17px] rounded-full items-center"
        style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: colors.dashedBorder }}
      >
        <Text className="text-[14px] font-o9 tracking-[0.05em] uppercase text-muted2">+ Add a proxy</Text>
      </Pressable>
      <Text className="text-xs font-o6 text-muted1 mt-3.5">System-wide VPN routing is not part of this app.</Text>
    </View>
  );
}
