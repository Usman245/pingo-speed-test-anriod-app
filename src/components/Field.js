import { createElement, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { colors } from '../theme';

// Keep controlled input events on React Native's native TextInput instead of
// routing them through NativeWind 4's JSX interop wrapper.
function NativeTextInput(props) {
  return createElement(TextInput, props);
}

export default function Field({
  label,
  className = '',
  onFocus,
  onBlur,
  ...inputProps
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View className={className}>
      <Text className="text-[10.5px] font-o8 tracking-[0.12em] uppercase text-muted1 mb-1.5">{label}</Text>
      <NativeTextInput
        style={[styles.input, focused && styles.focused]}
        placeholderTextColor={colors.muted3}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...inputProps}
      />
    </View>
  );
}

const styles = {
  input: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.bg,
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.ink,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  focused: {
    borderColor: colors.lime,
  },
};
