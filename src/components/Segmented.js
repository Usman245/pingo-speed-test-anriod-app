import { View, Pressable, Text } from 'react-native';
import { tapIn, tapDone } from '../lib/devlog';

const HIT = { top: 6, bottom: 6, left: 6, right: 6 };

export default function Segmented({
  options,
  value,
  onChange,
  trackClassName = 'bg-bg',
  optionClassName = 'py-2 px-4',
}) {
  return (
    <View className={`flex-row self-start gap-1 p-1 rounded-full ${trackClassName}`}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPressIn={() => tapIn(`segment:${opt.value}`)}
            onPress={() => {
              tapDone(`segment:${opt.value}`);
              onChange?.(opt.value);
            }}
            hitSlop={HIT}
            pressRetentionOffset={{ top: 24, bottom: 24, left: 24, right: 24 }}
            android_ripple={{ color: 'rgba(13,13,13,0.12)' }}
            // An inactive option is transparent; this keeps its hit area real.
            style={{ minHeight: 38, minWidth: 62, alignItems: 'center', justifyContent: 'center' }}
            className={`rounded-full ${optionClassName} ${active ? 'bg-lime shadow-sm shadow-ink/10' : 'bg-transparent'}`}
          >
            <Text className={`text-[13px] font-o8 ${active ? 'text-ink' : 'text-muted1'}`}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
