import { useRouter } from 'expo-router';
import { Ob3 } from '../src/screens/Onboarding';
import { useAppState } from '../src/context/AppStateProvider';

export default function Ob3Route() {
  const router = useRouter();
  const { setPhase } = useAppState();
  const toTest = () => {
    setPhase('idle');
    router.replace('/test');
  };
  return <Ob3 toAuth={() => router.replace('/auth')} toTest={toTest} />;
}
