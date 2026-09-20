// Anti-abus strict : compteur persistant en base (tient sur toutes les
// instances serverless), repli mémoire si la table rate_limits n'existe pas.
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

// Version stricte : fenêtre fixe persistée en base via le client service_role.
// Retourne { allowed }. En cas d'erreur base, retombe sur la mémoire.
export async function rateLimitStrict(client, request, { key, limit, windowMs }) {
  const id = `${key}:${clientIp(request)}`;
  try {
    const now = new Date();
    const { data: row } = await client.from('rate_limits').select('compteur, fenetre_debut').eq('cle', id).maybeSingle();
    if (!row || now - new Date(row.fenetre_debut) >= windowMs) {
      await client.from('rate_limits').upsert({ cle: id, compteur: 1, fenetre_debut: now.toISOString() }, { onConflict: 'cle' });
      return { allowed: true };
    }
    if (row.compteur >= limit) return { allowed: false };
    await client.from('rate_limits').update({ compteur: row.compteur + 1 }).eq('cle', id);
    return { allowed: true };
  } catch {
    return rateLimit(request, { key, limit, windowMs });
  }
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
