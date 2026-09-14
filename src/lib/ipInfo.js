export async function fetchIpInfo() {
  const res = await fetch('https://ipwho.is/');
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'IP lookup failed');
  return {
    ip: json.ip,
    isp: json.connection?.isp || json.connection?.org || 'Unknown ISP',
    org: json.connection?.org || json.connection?.isp || 'Unknown',
    asn: json.connection?.asn ? `AS${json.connection.asn}` : '—',
    city: json.city || '',
    region: json.region || '',
    country: json.country || '',
  };
}
