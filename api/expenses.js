import { createClient } from '@supabase/supabase-js';
import { getSession } from './_lib/auth.js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(request, response) {
  if (request.method === 'GET') return handleList(request, response);
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  const { identity } = await getSession(request);
  if (!identity) return response.status(401).json({ error: 'Session invalide ou expirée.' });

  const { action } = request.body || {};
  if (action === 'cancel') return handleCancel(request, response, identity);
  return handleCreate(request, response, identity);
}

async function handleList(request, response) {
  const { identity } = await getSession(request);
  if (!identity) return response.status(401).json({ error: 'Session invalide ou expirée.' });

  const entrepriseId = identity.entrepriseId || String(request.query.entreprise_id || '');
  let query = client
    .from('depenses')
    .select('*, magasins(nom), personnel(nom)')
    .eq('compte_id', identity.compteId)
    .eq('entreprise_id', entrepriseId)
    .order('date_heure', { ascending: false });
  if (identity.magasinId) query = query.eq('magasin_id', identity.magasinId);
  const { data, error } = await query;
  if (error) return response.status(400).json({ error: error.message });
  return response.status(200).json({ expenses: data });
}

async function handleCreate(request, response, identity) {
  const { montant, motif, magasin_id } = request.body || {};
  let storeId = identity.type === 'personnel' ? identity.magasinId : magasin_id;
  if (!Number.isInteger(montant) || montant <= 0 || !String(motif || '').trim() || !storeId) {
    return response.status(400).json({ error: 'Montant, motif et magasin sont requis.' });
  }
  const { data: store } = await client
    .from('magasins')
    .select('id, entreprise_id')
    .eq('id', storeId)
    .eq('compte_id', identity.compteId)
    .maybeSingle();
  if (!store) return response.status(400).json({ error: 'Magasin introuvable.' });
  const entrepriseId = store.entreprise_id;

  let adminNom = null;
  if (identity.type === 'compte') {
    const { data: compte } = await client.from('comptes').select('nom').eq('id', identity.compteId).maybeSingle();
    adminNom = compte?.nom || null;
  }

  const { data: expense, error } = await client
    .from('depenses')
    .insert({
      compte_id: identity.compteId,
      entreprise_id: entrepriseId,
      magasin_id: storeId,
      montant,
      motif: String(motif).trim().slice(0, 120),
      personnel_id: identity.type === 'personnel' ? identity.personnelId : null,
      admin_nom: adminNom
    })
    .select('*, magasins(nom), personnel(nom)')
    .single();
  if (error) return response.status(400).json({ error: error.message });
  return response.status(201).json({ expense });
}

async function handleCancel(request, response, identity) {
  if (identity.type !== 'compte') return response.status(403).json({ error: 'Annulation réservée au propriétaire.' });

  const { expense_id } = request.body || {};
  if (!expense_id) return response.status(400).json({ error: 'Dépense requise.' });

  const { data: expense, error } = await client
    .from('depenses')
    .update({ annulee: true, annulee_par: identity.compteId, annulee_le: new Date().toISOString() })
    .eq('id', expense_id)
    .eq('compte_id', identity.compteId)
    .eq('annulee', false)
    .select('id')
    .maybeSingle();
  if (error) return response.status(400).json({ error: error.message });
  if (!expense) return response.status(404).json({ error: 'Dépense introuvable ou déjà annulée.' });

  return response.status(200).json({ success: true });
}
