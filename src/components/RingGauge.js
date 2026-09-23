import { Animated, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

const SIZE = 230;
const C = SIZE / 2;

// The dial reads like a car speedometer: zero at the lower left, sweeping
// clockwise over the top to full scale at the lower right, gap at the bottom.
// Every angle here is measured from straight up, which is also the needle's
// own 0deg, so the arc and the needle cannot drift apart.
const START = -132;
const SWEEP = 264;

const R_TRACK = 88;
const TRACK_W = 10;

// The needle sits outside the arc and points in at the value. It can't live
// inside the ring: the reading in the middle is 64px and four characters wide
// at low speeds ("0.00"), and a bar drawn beside it reads as a minus sign.
const NEEDLE_TIP = 97;
const NEEDLE_LEN = 13;
const NEEDLE_HALF_W = 5.5;
// Rotating the needle about a point this far below its own centre pivots it
// on the dial centre.
const NEEDLE_PIVOT = NEEDLE_TIP + NEEDLE_LEN / 2;

const ARC_LEN = 2 * Math.PI * R_TRACK * (SWEEP / 360);

function polar(deg, r) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: C + r * Math.cos(rad), y: C + r * Math.sin(rad) };
}

function arcPath(r, from, to) {
  const a = polar(from, r);
  const b = polar(to, r);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
}

const TRACK_PATH = arcPath(R_TRACK, START, START + SWEEP);

const AnimatedPath = Animated.createAnimatedComponent(Path);

// `progress` is an Animated.Value (0..1). Driving the sweep through Animated
// keeps the needle off the React render path — it stays smooth even while the
// rest of the screen only redraws a few times a second.
export default function RingGauge({ progress }) {
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [`${START}deg`, `${START + SWEEP}deg`],
    extrapolate: 'clamp',
  });
  // Butt caps on the fill, so its leading edge lands exactly under the needle
  // rather than a half-stroke past it.
  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [ARC_LEN, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ width: SIZE, height: SIZE }}>
      <Svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
        <Path
          d={TRACK_PATH}
          fill="none"
          stroke={colors.track}
          strokeWidth={TRACK_W}
          strokeLinecap="round"
        />
        <AnimatedPath
          d={TRACK_PATH}
          fill="none"
          stroke={colors.lime}
          strokeWidth={TRACK_W}
          strokeLinecap="butt"
          strokeDasharray={[ARC_LEN, ARC_LEN]}
          strokeDashoffset={dashOffset}
        />
      </Svg>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: C - NEEDLE_HALF_W,
          top: C - NEEDLE_TIP - NEEDLE_LEN,
          width: 0,
          height: 0,
          borderLeftWidth: NEEDLE_HALF_W,
          borderRightWidth: NEEDLE_HALF_W,
          borderTopWidth: NEEDLE_LEN,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: colors.ink,
          transform: [
            { translateY: NEEDLE_PIVOT },
            { rotate },
            { translateY: -NEEDLE_PIVOT },
          ],
        }}
      />
    </View>
  );
}
