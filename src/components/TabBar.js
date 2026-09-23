import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors } from '../theme';

export const TABS = [
  { name: 'test', href: '/test', label: 'Test', radius: 999, gap: true },
  { name: 'details', href: '/details', label: 'Details', radius: 4, gap: false },
  { name: 'history', href: '/history', label: 'History', radius: [4, 4, 4, 0], gap: false },
  { name: 'proxy', href: '/proxy', label: 'Route', radius: 999, gap: false },
  { name: 'settings', href: '/settings', label: 'Setup', radius: 5, gap: false },
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

// Rendered inside <TabTrigger asChild>, which uses a Radix Slot to merge its
// own `isFocused`/`onPress`/`href` props onto this component's props — so
// this has to render the actual Pressable, not another TabTrigger.
export function TabButton({ tab, isFocused, ref, ...props }) {
  const color = isFocused ? colors.ink : colors.muted3;
  return (
    <Pressable {...props} ref={ref} style={[styles.trigger, isFocused && styles.triggerActive]}>
      <TabIcon radius={tab.radius} gap={tab.gap} color={color} />
      <Text
        style={[
          styles.label,
          { color, fontFamily: isFocused ? 'Outfit_900Black' : 'Outfit_800ExtraBold' },
        ]}
      >
        {tab.label}
      </Text>
    </Pressable>
  );
}

export const tabBarStyles = StyleSheet.create({
  tabList: {
    gap: 3,
    backgroundColor: colors.card,
    borderRadius: 26,
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 7,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
});

const styles = StyleSheet.create({
  trigger: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'transparent',
  },
  triggerActive: {
    backgroundColor: colors.lime,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.4,
  },
});
