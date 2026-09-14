import { View, Text } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path } from 'react-native-svg';
import Button from '../components/Button';
import PingoMark from '../components/PingoMark';
import { colors } from '../theme';

function Dots({ active }) {
  return (
    <View className="flex-row gap-[7px] mb-5">
      {[0, 1, 2].map((i) => (
        <View key={i} className={`w-[26px] h-1 rounded-full ${i === active ? 'bg-ink' : 'bg-dotinactive'}`} />
      ))}
    </View>
  );
}

function Kicker({ children, onSkip }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-[11.5px] font-o8 tracking-[0.16em] uppercase text-muted1">{children}</Text>
      {onSkip ? (
        <Button title="Skip" variant="text" onPress={onSkip} textClassName="text-[12.5px] py-1.5" />
      ) : null}
    </View>
  );
}

export function Ob1({ toOb2 }) {
  return (
    <View className="flex-1 pt-[52px] px-6 pb-[22px]">
      <View className="w-[62px] h-[62px] rounded-[22px] bg-lime shadow-lg shadow-ink/20 items-center justify-center">
        <PingoMark size={36} color={colors.ink} />
      </View>
      <View className="flex-1 justify-center gap-4">
        <Text className="text-[11.5px] font-o8 tracking-[0.2em] uppercase text-muted1">Pingo</Text>
        <Text className="font-o9 text-[52px] leading-[51px] tracking-[-0.045em] text-ink max-w-[320px]">
          Know your connection. Control your IP.
        </Text>
        <Text className="text-[15.5px] font-o5 leading-[23px] text-muted2 max-w-[290px]">
          Speed, latency and jitter in seconds — then route this app through the server you choose.
        </Text>
      </View>
      <Dots active={0} />
      <Button title="Get started" variant="primary" block onPress={toOb2} />
    </View>
  );
}

export function Ob2({ toOb3, toTest }) {
  return (
    <View className="flex-1 pt-[26px] px-[22px] pb-[22px]">
      <Kicker onSkip={toTest}>One of three</Kicker>
      <View className="flex-1 justify-center gap-6">
        <View className="bg-card rounded-[30px] shadow-md shadow-ink/[0.09] p-[26px] items-center justify-center">
          <View className="relative" style={{ width: 190, height: 190 }}>
            <Svg viewBox="0 0 190 190" width={190} height={190} style={{ transform: [{ rotate: '135deg' }] }}>
              <Circle cx={95} cy={95} r={80} fill="none" stroke={colors.track} strokeWidth={16} strokeLinecap="round" strokeDasharray="377 600" />
              <Circle cx={95} cy={95} r={80} fill="none" stroke={colors.lime} strokeWidth={16} strokeLinecap="round" strokeDasharray="268 600" />
            </Svg>
            <View className="absolute inset-0 items-center justify-center">
              <Text className="font-o9 text-[44px] leading-[44px] tracking-[-0.05em] text-ink">94.2</Text>
              <Text className="text-[11.5px] font-o8 text-muted1">Mbps</Text>
            </View>
          </View>
        </View>
        <Text className="font-o9 text-[34px] leading-[35px] tracking-[-0.04em] text-ink max-w-[320px]">
          Test your real download/upload speed and latency in seconds.
        </Text>
        <Text className="text-[14.5px] font-o5 leading-[21px] text-muted2 max-w-[290px]">
          Every result is kept, so a bad week of Wi-Fi is on record.
        </Text>
      </View>
      <Dots active={1} />
      <Button title="Next" variant="primary" block onPress={toOb3} />
    </View>
  );
}

export function Ob3({ toAuth, toTest }) {
  return (
    <View className="flex-1 pt-[26px] px-[22px] pb-[22px]">
      <Kicker onSkip={toTest}>Two of three</Kicker>
      <View className="flex-1 justify-center gap-6">
        <View className="bg-card rounded-[30px] shadow-md shadow-ink/[0.09] p-[26px] items-center justify-center">
          <Svg viewBox="0 0 180 180" width={180} height={180}>
            <Circle cx={90} cy={90} r={70} fill={colors.lime} />
            <Ellipse cx={90} cy={90} rx={30} ry={70} fill="none" stroke={colors.ink} strokeWidth={3} />
            <Line x1={20} y1={90} x2={160} y2={90} stroke={colors.ink} strokeWidth={3} />
            <Path d="M34 56 H146" stroke={colors.ink} strokeWidth={2} opacity={0.55} />
            <Path d="M34 124 H146" stroke={colors.ink} strokeWidth={2} opacity={0.55} />
            <Circle cx={132} cy={52} r={13} fill={colors.ink} />
            <Circle cx={132} cy={52} r={4.5} fill={colors.lime} />
          </Svg>
        </View>
        <Text className="font-o9 text-[34px] leading-[35px] tracking-[-0.04em] text-ink max-w-[320px]">
          Switch servers to change your app's visible IP.
        </Text>
        <Text className="text-[14.5px] font-o5 leading-[21px] text-muted2 max-w-[290px]">
          Routes this app's traffic only.
        </Text>
      </View>
      <Dots active={2} />
      <Button title="Continue" variant="primary" block onPress={toAuth} />
      <Button title="Skip for now" variant="text" block onPress={toTest} className="items-center" />
    </View>
  );
}
