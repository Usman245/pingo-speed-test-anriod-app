import { useEffect, useState } from 'react';
import { View } from 'react-native';
import TabBar from './components/TabBar';
import { Ob1, Ob2, Ob3 } from './screens/Onboarding';
import Auth from './screens/Auth';
import SpeedTest from './screens/SpeedTest';
import ConnectionDetails from './screens/ConnectionDetails';
import History from './screens/History';
import Proxy from './screens/Proxy';
import AddProxy from './screens/AddProxy';
import Settings from './screens/Settings';
import { PROXIES } from './data';
import { supabase } from './lib/supabase';
import { insertSpeedTest, fetchSpeedTests } from './lib/speedTests';
import { fetchIpInfo } from './lib/ipInfo';
import { fetchConnectionLabel } from './lib/connectionType';
import { fetchTestServer } from './lib/speedTestEngine';

const TAB_SCREENS = ['test', 'details', 'history', 'proxy', 'settings'];

export default function PingoApp({ onReady }) {
  const [screen, setScreen] = useState('ob1');
  const [phase, setPhase] = useState('idle');
  const [proxyId, setProxyId] = useState('direct');
  const [session, setSession] = useState(null);
  const [units, setUnits] = useState('Mbps');
  const [autosave, setAutosave] = useState(true);
  const [result, setResult] = useState(null);
  const [saveStatus, setSaveStatus] = useState('local');
  const [percentile, setPercentile] = useState(null);
  const [ipInfo, setIpInfo] = useState(null);
  const [connectionLabel, setConnectionLabel] = useState(null);
  const [serverInfo, setServerInfo] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshNetworkInfo = () =>
    Promise.all([
      fetchIpInfo().then(setIpInfo).catch(() => setIpInfo(null)),
      fetchConnectionLabel().then(setConnectionLabel).catch(() => setConnectionLabel(null)),
      fetchTestServer().then(setServerInfo).catch(() => setServerInfo(null)),
    ]);

  // The splash stays up until this first probe settles, so the ripple covers
  // real work rather than an artificial delay.
  useEffect(() => {
    refreshNetworkInfo().finally(() => onReady?.());
  }, []);

  const resolvedProxies = PROXIES.map((p) =>
    p.id === 'direct'
      ? {
          ...p,
          ip: ipInfo?.ip || '—',
          sub: ipInfo ? `${ipInfo.isp} · ${ipInfo.city}, ${ipInfo.country}` : 'Looking up ISP…',
          asn: ipInfo?.asn || '—',
        }
      : p
  );
  const proxy = resolvedProxies.find((p) => p.id === proxyId) || resolvedProxies[0];
  const routeName = proxy.id === 'direct' ? 'Direct connection' : proxy.name;
  const avatarInitials = session?.user?.email ? session.user.email.slice(0, 2).toUpperCase() : 'G';

  const go = (s) => setScreen(s);
  const toTest = () => {
    setScreen('test');
    setPhase('idle');
  };

  const handleTestStart = () => {
    setPhase('running');
    refreshNetworkInfo();
  };

  const handleTestDone = async (r) => {
    setResult(r);
    setPhase('done');

    if (session) {
      try {
        const past = await fetchSpeedTests(session.user.id, 50);
        setPercentile(
          past.length
            ? Math.round((past.filter((p) => Number(p.download_mbps) < r.download).length / past.length) * 100)
            : null
        );
      } catch {
        setPercentile(null);
      }
    } else {
      setPercentile(null);
    }

    if (!session || !autosave) {
      setSaveStatus('local');
      return;
    }
    setSaveStatus('saving');
    try {
      await insertSpeedTest(session.user.id, { ...r, routeId: proxy.id, routeIp: proxy.ip });
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  };

  const showTabs = TAB_SCREENS.includes(screen) && phase !== 'running';

  let body = null;
  switch (screen) {
    case 'ob1':
      body = <Ob1 toOb2={() => go('ob2')} />;
      break;
    case 'ob2':
      body = <Ob2 toOb3={() => go('ob3')} toTest={toTest} />;
      break;
    case 'ob3':
      body = <Ob3 toAuth={() => go('auth')} toTest={toTest} />;
      break;
    case 'auth':
      body = <Auth toTest={toTest} />;
      break;
    case 'details':
      body = (
        <ConnectionDetails
          proxy={proxy}
          connectionLabel={connectionLabel}
          serverLabel={serverInfo?.label}
          toTest={toTest}
          toProxy={() => go('proxy')}
        />
      );
      break;
    case 'history':
      body = <History userId={session?.user?.id} units={units} />;
      break;
    case 'proxy':
      body = <Proxy proxyId={proxyId} proxies={resolvedProxies} onSelect={setProxyId} routeIp={proxy.ip} toAdd={() => go('add')} />;
      break;
    case 'add':
      body = <AddProxy toProxy={() => go('proxy')} />;
      break;
    case 'settings':
      body = (
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
          toAuth={() => go('auth')}
          toOb1={() => go('ob1')}
        />
      );
      break;
    case 'test':
    default:
      body = (
        <SpeedTest
          phase={phase}
          onStart={handleTestStart}
          onCancel={() => setPhase('idle')}
          onReset={() => setPhase('idle')}
          onDone={handleTestDone}
          result={result}
          saveStatus={saveStatus}
          percentile={percentile}
          avatarInitials={avatarInitials}
          units={units}
          serverLabel={serverInfo?.city || serverInfo?.colo}
          routeName={routeName}
          routeIp={proxy.ip}
          routeSub={proxy.sub}
          toDetails={() => go('details')}
          toProxy={() => go('proxy')}
        />
      );
      break;
  }

  return (
    <View className="flex-1 bg-bg">
      {body}
      {showTabs ? <TabBar active={screen} onChange={go} /> : null}
    </View>
  );
}
