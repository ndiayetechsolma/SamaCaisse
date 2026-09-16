import { createClient } from '@supabase/supabase-js';
import { getSession } from './_lib/auth.js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  const { identity } = await getSession(request);
  if (!identity) return response.status(401).json({ error: 'Session invalide ou expirée.' });
  if (identity.type === 'personnel') return response.status(403).json({ error: 'Seul le propriétaire peut ajouter un magasin.' });

  const { action = 'create' } = request.body || {};

  if (action === 'rename') {
    const { magasin_id, nom = '' } = request.body || {};
    const trimmedNom = String(nom).trim();
    if (!magasin_id || !trimmedNom) return response.status(400).json({ error: 'Magasin et nouveau nom sont requis.' });
    if (trimmedNom.length > 60) return response.status(400).json({ error: 'Nom du magasin trop long.' });
    const { data: magasin, error } = await client
      .from('magasins')
      .update({ nom: trimmedNom })
      .eq('id', magasin_id)
      .eq('compte_id', identity.compteId)
      .select('id, nom, entreprise_id')
      .maybeSingle();
    if (error) {
      if (error.code === '23505') return response.status(409).json({ error: 'Un magasin porte déjà ce nom dans votre entreprise.' });
      return response.status(400).json({ error: error.message });
    }
    if (!magasin) return response.status(404).json({ error: 'Magasin introuvable.' });
    return response.status(200).json({ magasin });
  }

  const { entreprise_id = null, nom = '' } = request.body || {};
  const trimmedNom = String(nom).trim();
  if (!trimmedNom || !entreprise_id) {
    return response.status(400).json({ error: 'Nom du magasin et entreprise sont requis.' });
  }
  if (trimmedNom.length > 60) return response.status(400).json({ error: 'Nom du magasin trop long.' });

  const { data: owned } = await client
    .from('entreprises')
    .select('id')
    .eq('id', entreprise_id)
    .eq('compte_id', identity.compteId)
    .maybeSingle();
  if (!owned) return response.status(404).json({ error: 'Entreprise introuvable.' });

  const { data: magasin, error } = await client
    .from('magasins')
    .insert({ compte_id: identity.compteId, entreprise_id: owned.id, nom: trimmedNom })
    .select('id, nom, entreprise_id')
    .single();
  if (error) {
    if (error.code === '23505') return response.status(409).json({ error: 'Un magasin porte déjà ce nom dans votre entreprise.' });
    return response.status(400).json({ error: error.message });
  }

  return response.status(201).json({ magasin });
}