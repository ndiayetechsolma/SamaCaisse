import { createClient } from '@supabase/supabase-js';
import { getSession } from './_lib/auth.js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  const { identity } = await getSession(request);
  if (!identity) return response.status(401).json({ error: 'Session invalide ou expirée.' });

  const { action } = request.body || {};
  if (action === 'create') {
    const { nom, categorie = null, prix, stock = 0, magasin_id = null, entreprise_id = null } = request.body;
    const trimmedNom = String(nom || '').trim();
    if (!trimmedNom || !Number.isInteger(prix) || prix <= 0 || !Number.isInteger(stock) || stock < 0) {
      return response.status(400).json({ error: 'Nom, prix valide et stock valide sont requis.' });
    }
    const resolved = await resolveMagasin(magasin_id, entreprise_id, identity, response);
    if (!resolved) return;
    const { data: product, error } = await client
      .from('produits')
      .insert({
        compte_id: identity.compteId,
        entreprise_id: resolved.entreprise_id,
        magasin_id: resolved.magasin_id,
        nom: trimmedNom.slice(0, 60),
        categorie: String(categorie || '').trim().slice(0, 40) || null,
        prix,
        stock
      })
      .select('*, magasins(nom)')
      .single();
    if (error) {
      if (error.code === '23505') return response.status(409).json({ error: 'Ce produit existe déjà dans cet espace.' });
      return response.status(400).json({ error: error.message });
    }
    return response.status(201).json({ product });
  }

  if (action === 'update') {
    const { produit_id, nom, categorie, prix, stock } = request.body || {};
    if (!produit_id) return response.status(400).json({ error: 'Produit requis.' });
    const updates = {};
    if (nom !== undefined) {
      const trimmed = String(nom).trim();
      if (!trimmed) return response.status(400).json({ error: 'Nom invalide.' });
      updates.nom = trimmed.slice(0, 60);
    }
    if (categorie !== undefined) updates.categorie = String(categorie).trim().slice(0, 40) || null;
    if (prix !== undefined) {
      if (!Number.isInteger(prix) || prix <= 0) return response.status(400).json({ error: 'Prix invalide.' });
      updates.prix = prix;
    }
    if (stock !== undefined) {
      if (!Number.isInteger(stock) || stock < 0) return response.status(400).json({ error: 'Stock invalide.' });
      updates.stock = stock;
    }
    const { data: product, error } = await client
      .from('produits')
      .update(updates)
      .eq('id', produit_id)
      .eq('compte_id', identity.compteId)
      .select('*, magasins(nom)')
      .maybeSingle();
    if (error) return response.status(400).json({ error: error.message });
    if (!product) return response.status(404).json({ error: 'Produit introuvable.' });
    return response.status(200).json({ product });
  }

  if (action === 'toggle') {
    const { produit_id, actif } = request.body || {};
    if (!produit_id || typeof actif !== 'boolean') return response.status(400).json({ error: 'Produit et état requis.' });
    const { data: product, error } = await client
      .from('produits')
      .update({ actif })
      .eq('id', produit_id)
      .eq('compte_id', identity.compteId)
      .select('id, actif')
      .maybeSingle();
    if (error) return response.status(400).json({ error: error.message });
    if (!product) return response.status(404).json({ error: 'Produit introuvable.' });
    return response.status(200).json({ product });
  }

  return response.status(400).json({ error: 'Action inconnue.' });
}

async function resolveMagasin(magasinId, entrepriseId, identity, response) {
  if (identity.type === 'personnel') {
    return { entreprise_id: identity.entrepriseId, magasin_id: identity.magasinId };
  }
  if (magasinId) {
    const { data: store } = await client
      .from('magasins')
      .select('id, entreprise_id')
      .eq('id', magasinId)
      .eq('compte_id', identity.compteId)
      .maybeSingle();
    if (!store) {
      response.status(400).json({ error: 'Magasin introuvable.' });
      return null;
    }
    return { entreprise_id: store.entreprise_id, magasin_id: store.id };
  }
  const { data: owned } = await client
    .from('entreprises')
    .select('id')
    .eq('id', entrepriseId)
    .eq('compte_id', identity.compteId)
    .maybeSingle();
  if (!owned) {
    response.status(400).json({ error: 'Entreprise introuvable.' });
    return null;
  }
  return { entreprise_id: owned.id, magasin_id: null };
}