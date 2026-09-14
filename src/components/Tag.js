import { View, Text } from 'react-native';

export default function Tag({ label, className = '' }) {
  return (
    <View className={`self-start bg-lime py-[3px] px-[7px] rounded-full ${className}`}>
      <Text className="text-[9.5px] font-o9 tracking-[0.1em] uppercase text-ink">{label}</Text>
    </View>
  );
}
