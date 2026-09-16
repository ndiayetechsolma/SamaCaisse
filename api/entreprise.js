import { createClient } from '@supabase/supabase-js';
import { getComptePayload } from './_lib/auth.js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  const payload = await getComptePayload(request);
  if (!payload) return response.status(401).json({ error: 'Session invalide ou expirée.' });

  const { entreprise_id, nom, devise } = request.body || {};
  if (!entreprise_id) return response.status(400).json({ error: 'Entreprise requise.' });

  const updates = {};
  if (nom !== undefined) {
    const trimmedNom = String(nom).trim();
    if (!trimmedNom) return response.status(400).json({ error: 'Nom invalide.' });
    updates.nom = trimmedNom.slice(0, 60);
  }
  if (devise !== undefined) {
    const trimmedDevise = String(devise).trim();
    if (!trimmedDevise) return response.status(400).json({ error: 'Devise invalide.' });
    updates.devise = trimmedDevise.slice(0, 10);
  }
  if (Object.keys(updates).length === 0) return response.status(400).json({ error: 'Aucune modification fournie.' });

  const { data: entreprise, error } = await client
    .from('entreprises')
    .update(updates)
    .eq('id', entreprise_id)
    .eq('compte_id', payload.compte_id)
    .select('id, nom, devise')
    .maybeSingle();
  if (error) {
    if (error.code === '23505') return response.status(409).json({ error: 'Vous possédez déjà une entreprise portant ce nom.' });
    return response.status(400).json({ error: error.message });
  }
  if (!entreprise) return response.status(404).json({ error: 'Entreprise introuvable.' });

  return response.status(200).json({ entreprise });
}