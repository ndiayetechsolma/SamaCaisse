import { createClient } from '@supabase/supabase-js';
import { getSession } from './_lib/auth.js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  const { identity } = await getSession(request);
  if (!identity) return response.status(401).json({ error: 'Session invalide ou expirée.' });

  const { produit_id = null, nom_produit, quantite = 1, montant, mode_paiement, magasin_id } = request.body || {};
  if (!['liquide', 'mobile_money'].includes(mode_paiement) || !Number.isInteger(quantite) || quantite <= 0 || !Number.isInteger(montant) || montant <= 0) {
    return response.status(400).json({ error: 'Données de vente invalides.' });
  }

  let storeId = identity.type === 'personnel' ? identity.magasinId : magasin_id;
  if (!storeId) return response.status(400).json({ error: 'Magasin requis.' });

  const { data: store } = await client
    .from('magasins')
    .select('id, entreprise_id')
    .eq('id', storeId)
    .eq('compte_id', identity.compteId)
    .maybeSingle();
  if (!store) return response.status(400).json({ error: 'Magasin introuvable.' });
  const entrepriseId = store.entreprise_id;

  let finalProductId = null;
  let finalProductName = String(nom_produit || '').trim();
  let decrementedStock = null;

  if (produit_id) {
    const { data: product } = await client
      .from('produits')
      .select('id, nom, stock')
      .eq('id', produit_id)
      .eq('compte_id', identity.compteId)
      .eq('entreprise_id', entrepriseId)
      .maybeSingle();
    if (!product) return response.status(400).json({ error: 'Produit introuvable.' });

    const { data: updated, error: updateError } = await client
      .from('produits')
      .update({ stock: product.stock - quantite })
      .eq('id', product.id)
      .eq('compte_id', identity.compteId)
      .gte('stock', quantite)
      .select('id, stock');
    if (updateError) return response.status(400).json({ error: updateError.message });
    if (!updated?.length) return response.status(409).json({ error: `Stock insuffisant (${product.stock} restant): ${product.nom}` });

    finalProductId = product.id;
    finalProductName = product.nom;
    decrementedStock = updated[0].stock;
  }

  if (!finalProductName) return response.status(400).json({ error: 'Nom du produit requis.' });

  let adminNom = null;
  if (identity.type === 'compte') {
    const { data: compte } = await client.from('comptes').select('nom').eq('id', identity.compteId).maybeSingle();
    adminNom = compte?.nom || null;
  }

  const { data: sale, error: saleError } = await client
    .from('ventes')
    .insert({
      compte_id: identity.compteId,
      entreprise_id: entrepriseId,
      magasin_id: storeId,
      produit_id: finalProductId,
      nom_produit: finalProductName,
      quantite,
      montant,
      mode_paiement,
      personnel_id: identity.type === 'personnel' ? identity.personnelId : null,
      admin_nom: adminNom
    })
    .select('*, magasins(nom), personnel(nom)')
    .single();

  if (saleError) {
    if (finalProductId) {
      await client.from('produits').update({ stock: decrementedStock + quantite }).eq('id', finalProductId).eq('compte_id', identity.compteId);
    }
    return response.status(400).json({ error: saleError.message });
  }

  return response.status(201).json({ sale, stock: finalProductId ? decrementedStock : null });
}