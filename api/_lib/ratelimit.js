// Anti-abus minimaliste et gratuit (mémoire par instance serverless).
// Complète le honeypot + le piège temporel côté formulaires.
const buckets = new Map();

function clientIp(request) {
  try {
    const forwarded = request.headers?.['x-forwarded-for'] || '';
    const first = String(forwarded).split(',')[0].trim();
    if (first) return first;
    return request.socket?.remoteAddress || 'unknown';
  } catch {
    return 'unknown';
  }
}

export function rateLimit(request, { key, limit, windowMs }) {
  const now = Date.now();
  const id = `${key}:${clientIp(request)}`;
  const hits = (buckets.get(id) || []).filter(timestamp => now - timestamp < windowMs);
  hits.push(now);
  buckets.set(id, hits);
  if (buckets.size > 2000) {
    const oldest = buckets.keys().next().value;
    buckets.delete(oldest);
  }
  return { allowed: hits.length <= limit };
}

// Champ piège : les robots le remplissent, les humains ne le voient pas.
export function isHoneypotFilled(body, field = 'site_web') {
  return String(body?.[field] || '').trim().length > 0;
}

// Piège temporel : soumission trop rapide = robot probable (seuil 2 s).
export function isTooFast(body, field = 'form_debut', minMs = 2000) {
  const started = Number(body?.[field] || 0);
  if (!started) return false;
  return Date.now() - started < minMs;
}
