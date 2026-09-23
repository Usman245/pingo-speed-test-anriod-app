import { createContext, useContext, useEffect, useState } from 'react';
import * as Device from 'expo-device';
import { PROXIES } from '../data';
import { supabase } from '../lib/supabase';
import { insertSpeedTest, fetchSpeedTests } from '../lib/speedTests';
import { fetchIpInfo } from '../lib/ipInfo';
import { fetchConnectionLabel } from '../lib/connectionType';
import { fetchTestServer } from '../lib/speedTestEngine';

const AppStateContext = createContext(null);

function getDeviceName() {
  const brand = Device.brand || Device.manufacturer;
  const model = Device.modelName || Device.deviceName;
  if (brand && model && model.toLowerCase().includes(brand.toLowerCase())) return model;
  return [brand, model].filter(Boolean).join(' ') || 'This device';
}

export function AppStateProvider({ onReady, children }) {
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
  const [deviceName] = useState(getDeviceName);

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

  const value = {
    phase,
    setPhase,
    proxyId,
    setProxyId,
    session,
    units,
    setUnits,
    autosave,
    setAutosave,
    result,
    saveStatus,
    percentile,
    ipInfo,
    connectionLabel,
    deviceName,
    serverInfo,
    resolvedProxies,
    proxy,
    routeName,
    avatarInitials,
    refreshNetworkInfo,
    handleTestStart,
    handleTestDone,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
