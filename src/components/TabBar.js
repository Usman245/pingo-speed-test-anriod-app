import { View, Pressable, Text } from 'react-native';
import { colors } from '../theme';

const TABS = [
  { key: 'test', label: 'Test', radius: 999, gap: true },
  { key: 'details', label: 'Details', radius: 4, gap: false },
  { key: 'history', label: 'History', radius: [4, 4, 4, 0], gap: false },
  { key: 'proxy', label: 'Route', radius: 999, gap: false },
  { key: 'settings', label: 'Setup', radius: 5, gap: false },
];

function TabIcon({ radius, gap, color }) {
  const cornerStyle = Array.isArray(radius)
    ? {
        borderTopLeftRadius: radius[0],
        borderTopRightRadius: radius[1],
        borderBottomRightRadius: radius[2],
        borderBottomLeftRadius: radius[3],
      }
    : { borderRadius: radius };
  return (
    <View
      style={{
        width: 15,
        height: 15,
        borderWidth: 2.5,
        borderColor: color,
        borderRightColor: gap ? 'transparent' : color,
        ...cornerStyle,
      }}
    />
  );
}

export default function TabBar({ active, onChange }) {
  return (
    <View className="px-3.5 pt-2 pb-4">
      <View className="flex-row gap-[3px] bg-card rounded-[26px] shadow-md shadow-ink/10 py-2.5 px-[7px]">
        {TABS.map((t) => {
          const isActive = active === t.key;
          const color = isActive ? colors.ink : colors.muted3;
          return (
            <Pressable
              key={t.key}
              onPress={() => onChange(t.key)}
              className={`flex-1 items-center gap-1.5 py-2 rounded-[18px] ${isActive ? 'bg-lime' : 'bg-transparent'}`}
            >
              <TabIcon radius={t.radius} gap={t.gap} color={color} />
              <Text className={`text-[10px] tracking-[0.04em] ${isActive ? 'font-o9 text-ink' : 'font-o8 text-muted3'}`}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
