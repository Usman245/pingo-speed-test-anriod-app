import { useRouter } from 'expo-router';
import { Ob2 } from '../src/screens/Onboarding';
import { useAppState } from '../src/context/AppStateProvider';

export default function Ob2Route() {
  const router = useRouter();
  const { setPhase } = useAppState();
  const toTest = () => {
    setPhase('idle');
    router.replace('/test');
  };
  return <Ob2 toOb3={() => router.replace('/ob3')} toTest={toTest} />;
}
