import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddProxy from '../src/screens/AddProxy';

export default function AddProxyModal() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <AddProxy toProxy={() => router.dismissTo('/proxy')} />
    </SafeAreaView>
  );
}
