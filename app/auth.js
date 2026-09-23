import { useRouter } from 'expo-router';
import Auth from '../src/screens/Auth';
import { useAppState } from '../src/context/AppStateProvider';

export default function AuthRoute() {
  const router = useRouter();
  const { setPhase } = useAppState();
  const toTest = () => {
    setPhase('idle');
    router.replace('/test');
  };
  return <Auth toTest={toTest} toForgotPassword={() => router.push('/forgot-password')} />;
}
