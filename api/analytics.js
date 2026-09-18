import { createClient } from '@supabase/supabase-js';
import { getSuperAdminPayload } from './_lib/auth.js';
import { rateLimit } from './_lib/ratelimit.js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Mesure d'audience first-party : aucun cookie, envoi uniquement si l'utilisateur
// a accepté la mesure via la bannière cookies. 12e et dernière fonction Vercel.
const PAGES_AUTORISEES = ['/', '/app'];

export default async function handler(request, response) {
  if (request.method === 'POST') return handlePing(request, response);
  if (request.method === 'GET') return handleStats(request, response);
  return response.status(405).json({ error: 'Method not allowed' });
}

async function handlePing(request, response) {
  if (!rateLimit(request, { key: 'analytics', limit: 60, windowMs: 60000 }).allowed) {
    return response.status(429).json({ error: 'Trop de requêtes.' });
  }
  const { page } = request.body || {};
  if (!PAGES_AUTORISEES.includes(page)) return response.status(400).json({ error: 'Page invalide.' });
  const { error } = await client.rpc('enregistrer_visite', { p_page: page });
  if (error) return response.status(500).json({ error: 'Mesure indisponible.' });
  return response.status(200).json({ success: true });
}

async function handleStats(request, response) {
  const payload = await getSuperAdminPayload(request);
  if (!payload) return response.status(401).json({ error: 'Session invalide ou expirée.' });
  const depuis = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const { data, error } = await client
    .from('visites')
    .select('jour, page, compteur')
    .gte('jour', depuis)
    .order('jour', { ascending: false });
  if (error) return response.status(500).json({ error: error.message });
  const total = (data || []).reduce((somme, ligne) => somme + ligne.compteur, 0);
  return response.status(200).json({ total_30j: total, lignes: data || [] });
}
