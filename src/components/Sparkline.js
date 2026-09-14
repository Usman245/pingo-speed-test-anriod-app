import { memo } from 'react';
import { View } from 'react-native';

function Sparkline({ samples, height = 34 }) {
  const max = Math.max(1, ...samples);
  return (
    <View className="flex-row items-end gap-[2px] w-full" style={{ height }}>
      {samples.map((v, i) => (
        <View
          key={i}
          className="flex-1 rounded-[2px] bg-lime"
          style={{ height: Math.max(2, (v / max) * height) }}
        />
      ))}
    </View>
  );
}

export default memo(Sparkline);
