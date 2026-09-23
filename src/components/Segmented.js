import { createElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

const HIT = { top: 6, bottom: 6, left: 6, right: 6 };
const RETAIN = { top: 24, bottom: 24, left: 24, right: 24 };

// NativeWind 4's JSX interop predates this Expo 57 / React Native 0.86
// runtime. These wrappers keep the segmented control on native primitives.
function NativeView({ children, ...props }) {
  return createElement(View, props, children);
}

function NativePressable({ children, ...props }) {
  return createElement(Pressable, props, children);
}

function NativeText({ children, ...props }) {
  return createElement(Text, props, children);
}

export default function Segmented({
  options,
  value,
  onChange,
  trackColor = colors.bg,
  optionStyle,
}) {
  return (
    <NativeView style={[styles.track, { backgroundColor: trackColor }]}>
      {options.map((option) => {
        const active = option.value === value;

        return (
          <NativePressable
            key={option.value}
            accessibilityLabel={option.label}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            onPress={() => {
              if (!active) onChange(option.value);
            }}
            hitSlop={HIT}
            pressRetentionOffset={RETAIN}
            android_ripple={{ color: 'rgba(13,13,13,0.12)' }}
            style={({ pressed }) => [styles.pressTarget, pressed && styles.pressedOption]}
          >
            <NativeView
              style={[
                styles.option,
                optionStyle,
                active ? styles.activeOption : styles.inactiveOption,
              ]}
            >
              <NativeText
                style={[styles.label, active ? styles.activeLabel : styles.inactiveLabel]}
              >
                {option.label}
              </NativeText>
            </NativeView>
          </NativePressable>
        );
      })}
    </NativeView>
  );
}

const styles = StyleSheet.create({
  track: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.dashedBorder,
  },
  pressTarget: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  option: {
    minWidth: 62,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  activeOption: {
    backgroundColor: colors.lime,
    borderColor: 'rgba(13,13,13,0.08)',
  },
  inactiveOption: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  pressedOption: {
    opacity: 0.68,
  },
  label: {
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: 13,
  },
  activeLabel: {
    color: colors.ink,
  },
  inactiveLabel: {
    color: colors.muted1,
  },
});
