import { createClient } from '@supabase/supabase-js';
import { getComptePayload } from './_lib/auth.js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  const payload = await getComptePayload(request);
  if (!payload) return response.status(401).json({ error: 'Session invalide ou expirée.' });

  const { entreprise_nom, devise, magasin_nom } = request.body || {};
  const entrepriseNom = String(entreprise_nom || '').trim().slice(0, 60);
  const magasinNom = String(magasin_nom || '').trim().slice(0, 60);
  const effectiveDevise = String(devise || 'FCFA').trim().slice(0, 10) || 'FCFA';
  if (!entrepriseNom || !magasinNom) {
    return response.status(400).json({ error: 'Nom de l’entreprise et nom du magasin sont requis.' });
  }

  const { data: entreprise, error: entrepriseError } = await client
    .from('entreprises')
    .insert({ compte_id: payload.compte_id, nom: entrepriseNom, devise: effectiveDevise })
    .select('id, nom, devise')
    .single();
  if (entrepriseError) {
    if (entrepriseError.code === '23505') return response.status(400).json({ error: 'Vous possédez déjà une entreprise portant ce nom.' });
    return response.status(400).json({ error: entrepriseError.message });
  }

  const { data: magasin, error: magasinError } = await client
    .from('magasins')
    .insert({ compte_id: payload.compte_id, entreprise_id: entreprise.id, nom: magasinNom })
    .select('id, nom, entreprise_id')
    .single();
  if (magasinError) return response.status(400).json({ error: magasinError.message });

  return response.status(201).json({ entreprise, magasin });
}