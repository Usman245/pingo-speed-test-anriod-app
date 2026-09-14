// Speedometer scale — non-linear, like a physical dial: the low end where most
// connections live gets most of the sweep.
const SCALE = [0, 1, 5, 10, 25, 50, 100, 250, 500];

export function speedToRing(mbps) {
  const v = Math.max(0, mbps);
  for (let i = 0; i < SCALE.length - 1; i++) {
    if (v <= SCALE[i + 1]) {
      const within = (v - SCALE[i]) / (SCALE[i + 1] - SCALE[i]);
      return (i + within) / (SCALE.length - 1);
    }
  }
  return 1;
}

export function convertSpeed(mbps, units) {
  return units === 'MB/s' ? mbps / 8 : mbps;
}

export function speedLabel(units) {
  return units === 'MB/s' ? 'MB/s' : 'Mbps';
}

export function formatSpeed(mbps, units) {
  const v = convertSpeed(mbps, units);
  if (v >= 100) return v.toFixed(0);
  if (v >= 10) return v.toFixed(1);
  return v.toFixed(2);
}
