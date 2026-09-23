import History from '../../src/screens/History';
import { useAppState } from '../../src/context/AppStateProvider';

export default function HistoryTab() {
  const { session, units } = useAppState();
  return <History userId={session?.user?.id} units={units} />;
}
