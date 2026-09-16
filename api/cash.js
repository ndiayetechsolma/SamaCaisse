import { createClient } from '@supabase/supabase-js';
import { getSession } from './_lib/auth.js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(request, response) {
  const { identity } = await getSession(request);
  if (!identity) return response.status(401).json({ error: 'Session invalide ou expirée.' });

  const storeId = identity.type === 'personnel' ? identity.magasinId : (request.query.magasin_id || request.body?.magasin_id);
  if (!storeId) return response.status(400).json({ error: 'Magasin requis.' });

  const { data: store } = await client
    .from('magasins')
    .select('id, entreprise_id')
    .eq('id', storeId)
    .eq('compte_id', identity.compteId)
    .maybeSingle();
  if (!store) return response.status(400).json({ error: 'Magasin introuvable.' });

  const scoped = query => query.eq('compte_id', identity.compteId).eq('magasin_id', storeId);

  if (request.method === 'GET') {
    if (request.query.history === 'true') {
      const { data, error } = await scoped(client.from('caisses').select('*')).order('date_ouverture', { ascending: false }).limit(90);
      if (error) return response.status(400).json({ error: error.message });
      return response.status(200).json({ history: data });
    }
    const { data, error } = await scoped(client.from('caisses').select('*')).order('date_ouverture', { ascending: false }).limit(1).maybeSingle();
    if (error) return response.status(400).json({ error: error.message });
    return response.status(200).json({ cash: data });
  }

  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  const { action, montant_ouverture, montant_fermeture } = request.body || {};

  if (action === 'open') {
    if (!Number.isInteger(montant_ouverture) || montant_ouverture < 0) return response.status(400).json({ error: 'Montant d’ouverture invalide.' });
    const { data, error } = await client
      .from('caisses')
      .insert({
        compte_id: identity.compteId,
        entreprise_id: store.entreprise_id,
        magasin_id: storeId,
        montant_ouverture,
        ouverte_par: identity.type === 'personnel' ? identity.personnelId : null,
        ouverte_par_admin: identity.type === 'compte' ? identity.compteId : null
      })
      .select('*')
      .single();
    if (error) return response.status(400).json({ error: error.code === '23505' ? 'Une caisse est déjà ouverte dans ce magasin.' : error.message });
    return response.status(201).json({ cash: data });
  }

  if (action === 'close') {
    if (!Number.isInteger(montant_fermeture) || montant_fermeture < 0) return response.status(400).json({ error: 'Montant de fermeture invalide.' });
    const { data: cash } = await scoped(client.from('caisses').select('*')).is('date_fermeture', null).maybeSingle();
    if (!cash) return response.status(404).json({ error: 'Aucune caisse ouverte.' });
    const since = cash.date_ouverture;
    const [{ data: sales }, { data: expenses }] = await Promise.all([
      scoped(client.from('ventes').select('montant').eq('mode_paiement', 'liquide').eq('annulee', false)).gte('date_heure', since),
      scoped(client.from('depenses').select('montant').eq('annulee', false)).gte('date_heure', since)
    ]);
    const expected = cash.montant_ouverture + (sales || []).reduce((sum, row) => sum + row.montant, 0) - (expenses || []).reduce((sum, row) => sum + row.montant, 0);
    const { data, error } = await client
      .from('caisses')
      .update({
        montant_fermeture,
        ecart: montant_fermeture - expected,
        solde_theorique: expected,
        fermee_par: identity.type === 'personnel' ? identity.personnelId : null,
        fermee_par_admin: identity.type === 'compte' ? identity.compteId : null,
        date_fermeture: new Date().toISOString()
      })
      .eq('id', cash.id)
      .eq('compte_id', identity.compteId)
      .select('*')
      .single();
    if (error) return response.status(400).json({ error: error.message });
    return response.status(200).json({ cash: data, expected });
  }

  if (action === 'reopen') {
    const { data: cash } = await scoped(client.from('caisses').select('*')).order('date_ouverture', { ascending: false }).limit(1).maybeSingle();
    if (!cash || !cash.date_fermeture) return response.status(400).json({ error: 'Aucune caisse fermée à rouvrir.' });
    const { data, error } = await client
      .from('caisses')
      .update({ montant_fermeture: null, ecart: null, date_fermeture: null })
      .eq('id', cash.id)
      .eq('compte_id', identity.compteId)
      .select('*')
      .single();
    if (error) return response.status(400).json({ error: error.message });
    return response.status(200).json({ cash: data });
  }

  return response.status(400).json({ error: 'Action inconnue.' });
}