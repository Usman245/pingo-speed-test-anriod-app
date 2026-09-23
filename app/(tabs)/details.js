import { useRouter } from 'expo-router';
import ConnectionDetails from '../../src/screens/ConnectionDetails';
import { useAppState } from '../../src/context/AppStateProvider';

export default function DetailsTab() {
  const router = useRouter();
  const { proxy, connectionLabel, serverInfo } = useAppState();
  return (
    <ConnectionDetails
      proxy={proxy}
      connectionLabel={connectionLabel}
      serverLabel={serverInfo?.label}
      toTest={() => router.push('/test')}
      toProxy={() => router.push('/proxy')}
    />
  );
}
