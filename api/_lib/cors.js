// Refuse toute origine étrangère (CSRF/appel cross-site).
// Laisse passer les appels sans origine (curl, mobiles, serveur-à-serveur).
export function checkOrigin(request, response) {
  const origin = String(request.headers?.origin || '').trim();
  if (!origin) return true;
  try {
    const host = String(request.headers?.['x-forwarded-host'] || request.headers?.host || '').split(',')[0].trim().toLowerCase();
    const originHost = new URL(origin).host.toLowerCase();
    if (host && originHost === host) return true;
  } catch {}
  response.status(403).json({ error: 'Origine non autorisée.' });
  return false;
}
