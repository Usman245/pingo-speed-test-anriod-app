import { supabase } from './supabase';

export async function insertSpeedTest(userId, result) {
  const { error } = await supabase.from('speed_tests').insert({
    user_id: userId,
    download_mbps: result.download,
    upload_mbps: result.upload,
    latency_ms: result.latency,
    jitter_ms: result.jitter,
    loss_pct: result.loss,
    route_id: result.routeId,
    route_ip: result.routeIp,
  });
  if (error) throw error;
}

export async function fetchSpeedTestCount(userId) {
  const { count, error } = await supabase
    .from('speed_tests')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw error;
  return count || 0;
}

export async function fetchSpeedTests(userId, limit = 12) {
  const { data, error } = await supabase
    .from('speed_tests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}
