import { Pressable, Text } from 'react-native';
import { tapIn, tapDone } from '../lib/devlog';

const variantWrap = {
  primary: 'bg-ink',
  secondary: 'bg-card',
  link: 'bg-transparent',
  text: 'bg-transparent',
};
const variantPad = {
  primary: 'py-[19px] px-6 rounded-full',
  secondary: 'py-[17px] px-6 rounded-full',
  link: 'px-2 rounded-full',
  text: 'px-3 rounded-full',
};
const variantShadow = {
  primary: 'shadow-lg shadow-ink/20',
  secondary: 'shadow-md shadow-ink/[0.08]',
  link: '',
  text: '',
};
const variantText = {
  primary: 'text-lime font-o9 text-[15.5px] uppercase tracking-[0.06em]',
  secondary: 'text-ink font-o9 text-sm uppercase tracking-[0.05em]',
  link: 'text-ink font-o9 text-[12.5px] underline',
  text: 'text-muted2 font-o8 text-sm',
};
// Transparent variants carry no padding-derived box, so give them a real,
// guaranteed hit area rather than trusting the text's own height.
const variantBox = {
  primary: null,
  secondary: null,
  link: { minHeight: 40, justifyContent: 'center' },
  text: { minHeight: 48, justifyContent: 'center' },
};

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };
// Text around these buttons reflows when network data lands, which nudges them
// mid-press; without this the press is cancelled and the tap is swallowed.
const RETAIN = { top: 24, bottom: 24, left: 24, right: 24 };

export default function Button({
  title,
  onPress,
  variant = 'secondary',
  block = false,
  disabled = false,
  className = '',
  textClassName = '',
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => tapIn(`button:${title}`)}
      onPress={() => {
        tapDone(`button:${title}`);
        onPress?.();
      }}
      hitSlop={HIT}
      pressRetentionOffset={RETAIN}
      android_ripple={{ color: 'rgba(13,13,13,0.12)' }}
      style={variantBox[variant]}
      className={`items-center justify-center ${variantWrap[variant]} ${variantPad[variant]} ${variantShadow[variant]} ${block ? 'w-full' : 'self-start'} ${disabled ? 'opacity-40' : ''} ${className}`}
    >
      <Text className={`${variantText[variant]} ${textClassName}`}>{title}</Text>
    </Pressable>
  );
}
