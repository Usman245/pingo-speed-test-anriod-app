import { Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const ARC = 452; // dash length of the fixed 3/4-circle ring at r=96
const SIZE = 230;

// `progress` is an Animated.Value (0..1). Driving the dash offset through
// Animated keeps the needle off the React render path — the sweep stays smooth
// even while the rest of the screen updates only a few times a second.
export default function RingGauge({ progress }) {
  return (
    <Svg viewBox="0 0 230 230" width={SIZE} height={SIZE} style={{ transform: [{ rotate: '135deg' }] }}>
      <Circle
        cx={115}
        cy={115}
        r={96}
        fill="none"
        stroke={colors.track}
        strokeWidth={18}
        strokeLinecap="round"
        strokeDasharray={`${ARC} 700`}
      />
      <AnimatedCircle
        cx={115}
        cy={115}
        r={96}
        fill="none"
        stroke={colors.lime}
        strokeWidth={18}
        strokeLinecap="round"
        strokeDasharray={`${ARC} 700`}
        strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [ARC, 0] })}
      />
    </Svg>
  );
}
