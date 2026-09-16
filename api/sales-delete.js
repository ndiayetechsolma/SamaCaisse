import { createClient } from '@supabase/supabase-js';
import { getSession } from './_lib/auth.js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  const { identity } = await getSession(request);
  if (!identity) return response.status(401).json({ error: 'Session invalide ou expirée.' });
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