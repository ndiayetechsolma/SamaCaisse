import { createClient } from '@supabase/supabase-js';
import { getSession } from './_lib/auth.js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  const { identity } = await getSession(request);
  if (!identity) return response.status(401).json({ error: 'Session invalide ou expirée.' });
  if (identity.type !== 'compte') return response.status(403).json({ error: 'Réservé au propriétaire.' });

  const { personnel_id, actif } = request.body || {};
  if (!personnel_id || typeof actif !== 'boolean') return response.status(400).json({ error: 'Membre et état requis.' });

  const { data: member, error } = await client
    .from('personnel')
    .update({ actif })
    .eq('id', personnel_id)
    .eq('compte_id', identity.compteId)
    .select('id, nom, actif')
    .maybeSingle();
  if (error) return response.status(400).json({ error: error.message });
  if (!member) return response.status(404).json({ error: 'Membre introuvable.' });

  return response.status(200).json({ membre: member });
}