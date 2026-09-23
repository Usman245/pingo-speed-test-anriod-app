import { useRouter } from 'expo-router';
import { Ob1 } from '../src/screens/Onboarding';

export default function Ob1Route() {
  const router = useRouter();
  return <Ob1 toOb2={() => router.replace('/ob2')} />;
}
