import { View } from 'react-native';
import { useRouter } from 'expo-router';
import SpeedTest from '../../src/screens/SpeedTest';
import { useAppState } from '../../src/context/AppStateProvider';

export default function TestTab() {
  const router = useRouter();
  const {
    phase,
    setPhase,
    handleTestStart,
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

  if (phase === 'running') {
    // The live view lives at /test-running; avoid mounting a second
    // SpeedTest instance here, which would double-fire network probes
    // since native-stack keeps this screen mounted underneath the push.
    return <View className="flex-1 bg-bg" />;
  }

  return (
    <SpeedTest
      phase={phase}
      onStart={() => {
        handleTestStart();
        router.push('/test-running');
      }}
      onCancel={() => setPhase('idle')}
      onReset={() => setPhase('idle')}
      onDone={handleTestDone}
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
      toDetails={() => router.push('/details')}
      toProxy={() => router.push('/proxy')}
    />
  );
}
