import { useRouter } from 'expo-router';
import Proxy from '../../src/screens/Proxy';
import { useAppState } from '../../src/context/AppStateProvider';

export default function ProxyTab() {
  const router = useRouter();
  const { proxyId, resolvedProxies, setProxyId, proxy } = useAppState();
  return (
    <Proxy
      proxyId={proxyId}
      proxies={resolvedProxies}
      onSelect={setProxyId}
      routeIp={proxy.ip}
      toAdd={() => router.push('/add-proxy')}
    />
  );
}
