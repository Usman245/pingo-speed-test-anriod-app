import { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { ARC_PATHS } from './PingoMark';
import { colors } from '../theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const STAGE = 230;
const RIPPLE = 200;
const GLYPH = 186;
const DOT = 25;
const DASH = 96;

// Timings are the design's, in ms.
const RIPPLE_DELAYS = [180, 380, 580];
const ARC_DELAYS = [340, 520, 700];
const INTRO_MS = 1900;

const easeRipple = Easing.bezier(0.2, 0.7, 0.3, 1);
const easeDraw = Easing.bezier(0.3, 0.8, 0.3, 1);
const easeWord = Easing.bezier(0.2, 0.8, 0.3, 1);
const easeDot = Easing.bezier(0.3, 1.5, 0.4, 1);

export default function SplashAnimation({ dismiss = false, onIntroDone, onHidden }) {
  const dot = useRef(new Animated.Value(0)).current;
  const ripples = useRef(RIPPLE_DELAYS.map(() => new Animated.Value(0))).current;
  // strokeDashoffset can't run on the native driver, so the arcs get their own values.
  const arcs = useRef(ARC_DELAYS.map(() => new Animated.Value(0))).current;
  const word = useRef(new Animated.Value(0)).current;
  const tag = useRef(new Animated.Value(0)).current;
  const idle = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animations = [
      Animated.timing(dot, { toValue: 1, duration: 500, easing: easeDot, useNativeDriver: true }),
      ...ripples.map((v, i) =>
        Animated.timing(v, {
          toValue: 1,
          duration: 1500,
          delay: RIPPLE_DELAYS[i],
          easing: easeRipple,
          useNativeDriver: true,
        })
      ),
      ...arcs.map((v, i) =>
        Animated.timing(v, {
          toValue: 1,
          duration: 600,
          delay: ARC_DELAYS[i],
          easing: easeDraw,
          useNativeDriver: false,
        })
      ),
      Animated.timing(word, { toValue: 1, duration: 600, delay: 1050, easing: easeWord, useNativeDriver: true }),
      Animated.timing(tag, { toValue: 1, duration: 600, delay: 1350, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ];
    Animated.parallel(animations).start();

    const idleLoop = Animated.loop(
      Animated.timing(idle, { toValue: 1, duration: 2600, easing: Easing.out(Easing.ease), useNativeDriver: true })
    );
    const idleTimer = setTimeout(() => idleLoop.start(), 2000);
    const introTimer = setTimeout(() => onIntroDone?.(), INTRO_MS);

    return () => {
      clearTimeout(idleTimer);
      clearTimeout(introTimer);
      idleLoop.stop();
    };
  }, []);

  useEffect(() => {
    if (!dismiss) return;
    Animated.timing(fade, { toValue: 0, duration: 320, easing: Easing.out(Easing.ease), useNativeDriver: true }).start(
      () => onHidden?.()
    );
  }, [dismiss]);

  const rippleStyle = (v, width) => ({
    position: 'absolute',
    left: (STAGE - RIPPLE) / 2,
    top: (STAGE - RIPPLE) / 2,
    width: RIPPLE,
    height: RIPPLE,
    borderRadius: RIPPLE / 2,
    borderWidth: width,
    borderColor: colors.lime,
    opacity: v.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0, 0.85, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.14, 1.9] }) }],
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { opacity: fade }]}>
      <View style={styles.stage}>
        {ripples.map((v, i) => (
          <Animated.View key={i} style={rippleStyle(v, 2.5)} />
        ))}
        <Animated.View
          style={{
            position: 'absolute',
            left: (STAGE - RIPPLE) / 2,
            top: (STAGE - RIPPLE) / 2,
            width: RIPPLE,
            height: RIPPLE,
            borderRadius: RIPPLE / 2,
            borderWidth: 2,
            borderColor: colors.lime,
            opacity: idle.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.6, 0] }),
            transform: [{ scale: idle.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.8] }) }],
          }}
        />

        <View style={styles.glyph}>
          <Svg viewBox="0 0 120 120" width={GLYPH} height={GLYPH}>
            <G fill="none" stroke={colors.lime} strokeWidth={8.5} strokeLinecap="round">
              {ARC_PATHS.map((d, i) => (
                <AnimatedPath
                  key={d}
                  d={d}
                  strokeDasharray={DASH}
                  strokeDashoffset={arcs[i].interpolate({ inputRange: [0, 1], outputRange: [DASH, 0] })}
                  opacity={arcs[i].interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1] })}
                />
              ))}
            </G>
          </Svg>
        </View>

        <Animated.View
          style={[
            styles.dot,
            {
              opacity: dot.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1] }),
              transform: [{ scale: dot }],
            },
          ]}
        />
      </View>

      <View style={styles.textBlock}>
        <Animated.Text
          style={[
            styles.word,
            { opacity: word, transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] },
          ]}
        >
          Pingo
        </Animated.Text>
        <Animated.Text style={[styles.tagline, { opacity: tag }]}>Know your connection</Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 44,
  },
  stage: { width: STAGE, height: STAGE, alignItems: 'center', justifyContent: 'center' },
  glyph: { position: 'absolute', left: (STAGE - GLYPH) / 2, top: (STAGE - GLYPH) / 2 },
  dot: {
    position: 'absolute',
    left: (STAGE - DOT) / 2,
    top: (STAGE - DOT) / 2,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.lime,
  },
  textBlock: { alignItems: 'center', gap: 8 },
  word: {
    fontFamily: 'Outfit_900Black',
    fontSize: 42,
    lineHeight: 44,
    letterSpacing: -2.1,
    color: colors.bg,
  },
  tagline: {
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: '#8d8b83',
  },
});
