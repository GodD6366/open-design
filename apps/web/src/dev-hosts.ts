function normalizeHost(value: string | undefined) {
  return String(value || '127.0.0.1')
    .trim()
    .toLowerCase()
    .replace(/^\[(.*)\]$/, '$1');
}

function addCarrierGradeNatPatterns(hosts: Set<string>) {
  for (let second = 64; second <= 127; second += 1) {
    hosts.add(`100.${second}.*.*`);
  }
}

export function resolveAllowedDevOriginsForHost(rawHost: string | undefined): string[] {
  const host = normalizeHost(rawHost);
  const baseHosts = new Set(['127.0.0.1', 'localhost']);
  if (host === '0.0.0.0' || host === '::') {
    baseHosts.add('*.local');
    baseHosts.add('10.*.*.*');
    for (let second = 16; second <= 31; second += 1) {
      baseHosts.add(`172.${second}.*.*`);
    }
    baseHosts.add('192.168.*.*');
    baseHosts.add('169.254.*.*');
    addCarrierGradeNatPatterns(baseHosts);
  } else {
    baseHosts.add(host);
  }
  return [...baseHosts];
}
