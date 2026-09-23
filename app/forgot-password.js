import { useRouter } from 'expo-router';
import ForgotPassword from '../src/screens/ForgotPassword';

export default function ForgotPasswordRoute() {
  const router = useRouter();
  return <ForgotPassword toAuth={() => router.dismissTo('/auth')} />;
}
