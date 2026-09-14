import { useState } from 'react';
import { View, Text, TextInput } from 'react-native';

export default function Field({ label, className = '', ...inputProps }) {
  const [focused, setFocused] = useState(false);
  return (
    <View className={className}>
      <Text className="text-[10.5px] font-o8 tracking-[0.12em] uppercase text-muted1 mb-1.5">{label}</Text>
      <TextInput
        className={`w-full py-3.5 px-4 rounded-2xl bg-bg text-[15px] font-o6 text-ink border-2 ${focused ? 'border-lime' : 'border-transparent'}`}
        placeholderTextColor="#9b998f"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...inputProps}
      />
    </View>
  );
}
