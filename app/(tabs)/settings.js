import { useRouter } from 'expo-router';
import Settings from '../../src/screens/Settings';
import { useAppState } from '../../src/context/AppStateProvider';

export default function SettingsTab() {
  const router = useRouter();
  const {
    session,
    units,
    setUnits,
    autosave,
    setAutosave,
    serverInfo,
    connectionLabel,
    refreshNetworkInfo,
  } = useAppState();
  return (
    <Settings
      email={session?.user?.email}
      userId={session?.user?.id}
      units={units}
      onUnitsChange={setUnits}
      autosave={autosave}
      onAutosaveChange={setAutosave}
      serverLabel={serverInfo?.label}
      connectionLabel={connectionLabel}
      onRefreshNetwork={refreshNetworkInfo}
      toAuth={() => router.replace('/auth')}
      toOb1={() => router.replace('/')}
    />
  );
}
