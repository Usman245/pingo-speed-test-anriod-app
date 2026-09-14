import { View, Pressable } from 'react-native';

export function Card({ children, onPress, className = '' }) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper onPress={onPress} className={`bg-card rounded-[26px] shadow-md shadow-ink/[0.08] ${className}`}>
      {children}
    </Wrapper>
  );
}
