import { createClient } from '@supabase/supabase-js';
import { getSession } from './_lib/auth.js';
import { checkOrigin } from './_lib/cors.js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(request, response) {
  if (!checkOrigin(request, response)) return;
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  const { identity } = await getSession(request);
  if (!identity) return response.status(401).json({ error: 'Session invalide ou expirée.' });
  if (identity.type === 'personnel') return response.status(403).json({ error: 'Seul le propriétaire peut gérer les boutiques.' });

  const { action = 'create' } = request.body || {};

  if (action === 'delete') {
    const { magasin_id } = request.body || {};
    if (!magasin_id) return response.status(400).json({ error: 'Boutique requise.' });
    const { data: existing } = await client
      .from('magasins')
      .select('id, entreprise_id')
      .eq('id', magasin_id)
      .eq('compte_id', identity.compteId)
      .maybeSingle();
    if (!existing) return response.status(404).json({ error: 'Boutique introuvable.' });
    const { count } = await client
      .from('magasins')
      .select('id', { count: 'exact', head: true })
      .eq('compte_id', identity.compteId)
      .eq('entreprise_id', existing.entreprise_id);
    if ((count ?? 0) <= 1) return response.status(400).json({ error: 'Impossible de supprimer votre dernière boutique.' });
    const { error } = await client
      .from('magasins')
      .delete()
      .eq('id', magasin_id)
      .eq('compte_id', identity.compteId);
    if (error) { console.error('magasins/delete:', error.message); return response.status(400).json({ error: 'Suppression impossible.' }); }
    return response.status(200).json({ success: true });
  }

  if (action === 'rename') {
    const { magasin_id, nom = '' } = request.body || {};
    const trimmedNom = String(nom).trim();
    if (!magasin_id || !trimmedNom) return response.status(400).json({ error: 'Boutique et nouveau nom sont requis.' });
    if (trimmedNom.length > 60) return response.status(400).json({ error: 'Nom de la boutique trop long.' });
    const { data: magasin, error } = await client
      .from('magasins')
      .update({ nom: trimmedNom })
      .eq('id', magasin_id)
      .eq('compte_id', identity.compteId)
      .select('id, nom, entreprise_id')
      .maybeSingle();
    if (error) {
      if (error.code === '23505') return response.status(409).json({ error: 'Une boutique porte déjà ce nom dans votre entreprise.' });
      console.error('magasins/rename:', error.message);
      return response.status(400).json({ error: 'Données invalides.' });
    }
    if (!magasin) return response.status(404).json({ error: 'Boutique introuvable.' });
    return response.status(200).json({ magasin });
  }

  const { entreprise_id = null, nom = '' } = request.body || {};
  const trimmedNom = String(nom).trim();
  if (!trimmedNom || !entreprise_id) {
    return response.status(400).json({ error: 'Nom de la boutique et entreprise sont requis.' });
  }
  if (trimmedNom.length > 60) return response.status(400).json({ error: 'Nom de la boutique trop long.' });

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
    if (error.code === '23505') return response.status(409).json({ error: 'Une boutique porte déjà ce nom dans votre entreprise.' });
    console.error('magasins/create:', error.message);
    return response.status(400).json({ error: 'Données invalides.' });
  }

  return response.status(201).json({ magasin });
}