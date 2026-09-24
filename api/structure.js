import { createClient } from '@supabase/supabase-js';
import { getSession } from './_lib/auth.js';
import { checkOrigin } from './_lib/cors.js';

// Regroupe les réglages de structure (boutiques + entreprise) autrefois
// répartis sur deux fonctions, pour libérer un slot Vercel (limite 12).
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(request, response) {
  if (!checkOrigin(request, response)) return;
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  const { identity } = await getSession(request);
  if (!identity) return response.status(401).json({ error: 'Session invalide ou expirée.' });
  if (identity.type === 'personnel') return response.status(403).json({ error: 'Réservé au propriétaire.' });

  const { action = 'create' } = request.body || {};
  if (action === 'entreprise') return handleEntreprise(request, response, identity);
  if (action === 'delete') return handleDelete(request, response, identity);
  if (action === 'rename') return handleRename(request, response, identity);
  return handleCreate(request, response, identity);
}

async function handleDelete(request, response, identity) {
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
  if (error) { console.error('structure/delete:', error.message); return response.status(400).json({ error: 'Suppression impossible.' }); }
  return response.status(200).json({ success: true });
}

async function handleRename(request, response, identity) {
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
    console.error('structure/rename:', error.message);
    return response.status(400).json({ error: 'Données invalides.' });
  }
  if (!magasin) return response.status(404).json({ error: 'Boutique introuvable.' });
  return response.status(200).json({ magasin });
}

async function handleCreate(request, response, identity) {
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
    console.error('structure/create:', error.message);
    return response.status(400).json({ error: 'Données invalides.' });
  }

  return response.status(201).json({ magasin });
}

async function handleEntreprise(request, response, identity) {
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
    .eq('compte_id', identity.compteId)
    .select('id, nom, devise')
    .maybeSingle();
  if (error) {
    if (error.code === '23505') return response.status(409).json({ error: 'Vous possédez déjà une entreprise portant ce nom.' });
    console.error('structure/entreprise:', error.message);
    return response.status(400).json({ error: 'Données invalides.' });
  }
  if (!entreprise) return response.status(404).json({ error: 'Entreprise introuvable.' });

  return response.status(200).json({ entreprise });
}
