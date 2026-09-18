import { createClient } from '@supabase/supabase-js';
import { getSession } from './_lib/auth.js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  const { identity } = await getSession(request);
  if (!identity) return response.status(401).json({ error: 'Session invalide ou expirée.' });

  const { action } = request.body || {};
  if (action === 'cancel') return handleCancel(request, response, identity);
  return handleCreate(request, response, identity);
}

async function handleCreate(request, response, identity) {
  const { produit_id = null, nom_produit, quantite = 1, montant, mode_paiement, magasin_id } = request.body || {};
  if (!['liquide', 'mobile_money'].includes(mode_paiement) || !Number.isInteger(quantite) || quantite <= 0 || !Number.isInteger(montant) || montant <= 0) {
    return response.status(400).json({ error: 'Données de vente invalides.' });
  }

  let storeId = identity.type === 'personnel' ? identity.magasinId : magasin_id;
  if (!storeId) return response.status(400).json({ error: 'Boutique requise.' });

  const { data: store } = await client
    .from('magasins')
    .select('id, entreprise_id')
    .eq('id', storeId)
    .eq('compte_id', identity.compteId)
    .maybeSingle();
  if (!store) return response.status(400).json({ error: 'Boutique introuvable.' });
  const entrepriseId = store.entreprise_id;

  let finalProductId = null;
  let finalProductName = String(nom_produit || '').trim() || 'Vente';
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

async function handleCancel(request, response, identity) {
  if (identity.type !== 'compte') return response.status(403).json({ error: 'Annulation réservée au propriétaire.' });

  const { sale_id } = request.body || {};
  if (!sale_id) return response.status(400).json({ error: 'Vente requise.' });

  const { data: sale } = await client
    .from('ventes')
    .select('id, produit_id, quantite')
    .eq('id', sale_id)
    .eq('compte_id', identity.compteId)
    .eq('annulee', false)
    .maybeSingle();
  if (!sale) return response.status(404).json({ error: 'Vente introuvable ou déjà annulée.' });

  const { error } = await client
    .from('ventes')
    .update({ annulee: true, annulee_par: identity.compteId, annulee_le: new Date().toISOString() })
    .eq('id', sale.id)
    .eq('compte_id', identity.compteId);
  if (error) return response.status(400).json({ error: error.message });

  if (sale.produit_id) {
    const { data: product } = await client
      .from('produits')
      .select('stock')
      .eq('id', sale.produit_id)
      .eq('compte_id', identity.compteId)
      .maybeSingle();
    if (product) {
      await client
        .from('produits')
        .update({ stock: product.stock + sale.quantite })
        .eq('id', sale.produit_id)
        .eq('compte_id', identity.compteId);
    }
  }

  return response.status(200).json({ success: true });
}
