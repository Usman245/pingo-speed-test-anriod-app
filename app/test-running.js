import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import SpeedTest from '../src/screens/SpeedTest';
import { useAppState } from '../src/context/AppStateProvider';

export default function TestRunning() {
  const router = useRouter();
  const {
    phase,
    setPhase,
    handleTestDone,
    result,
    saveStatus,
    percentile,
    avatarInitials,
    units,
    serverInfo,
    ipInfo,
    connectionLabel,
    deviceName,
    routeName,
    proxy,
  } = useAppState();

  // dismissTo targets the /test route directly regardless of the current
  // navigation stack shape, so it can't throw "GO_BACK was not handled" the
  // way router.back() can if this screen is ever reached without a screen
  // beneath it (deep link, fast refresh, or a second call racing an earlier one).
  const returnToTest = () => router.dismissTo('/test');

  const cancel = () => {
    setPhase('idle');
    returnToTest();
  };

  // Guards against reaching this route directly with a stale phase (deep
  // link, fast refresh). Mount-only: cancel()/onDone below already call
  // returnToTest() themselves, so re-running this on every phase change would
  // fire a second, redundant navigation alongside theirs.
  useEffect(() => {
    if (phase !== 'running') returnToTest();
  }, []);

  // Android hardware back must go through the same cancel path as the
  // Cancel button, not a bare pop that would leave phase stuck at 'running'.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      cancel();
      return true;
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <SpeedTest
        phase={phase}
        onStart={() => {}}
        onCancel={cancel}
        onReset={cancel}
        onDone={async (r) => {
          await handleTestDone(r);
          returnToTest();
        }}
        result={result}
        saveStatus={saveStatus}
        percentile={percentile}
        avatarInitials={avatarInitials}
        units={units}
        serverLabel={serverInfo?.city || serverInfo?.colo}
        ispName={ipInfo?.isp}
        connectionLabel={connectionLabel}
        deviceName={deviceName}
        routeName={routeName}
        routeIp={proxy.ip}
        routeSub={proxy.sub}
        toDetails={() => {}}
        toProxy={() => {}}
      />
    </SafeAreaView>
  );
}
