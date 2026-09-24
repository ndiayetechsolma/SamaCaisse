import { createClient } from '@supabase/supabase-js';
import { getSession } from './_lib/auth.js';
import { checkOrigin } from './_lib/cors.js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Dettes clients : crédit accordé, échéances, encaissements partiels.
export default async function handler(request, response) {
  if (!checkOrigin(request, response)) return;
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  const { identity } = await getSession(request);
  if (!identity) return response.status(401).json({ error: 'Session invalide ou expirée.' });

  const { action } = request.body || {};
  if (action === 'pay') return handlePay(request, response, identity);
  if (action === 'cancel') return handleCancel(request, response, identity);
  return handleCreate(request, response, identity);
}

async function resolveStore(magasinId, identity) {
  const storeId = identity.type === 'personnel' ? identity.magasinId : magasinId;
  if (!storeId) return null;
  const { data: store } = await client
    .from('magasins')
    .select('id, entreprise_id')
    .eq('id', storeId)
    .eq('compte_id', identity.compteId)
    .maybeSingle();
  return store;
}

function acteur(identity) {
  return {
    personnel_id: identity.type === 'personnel' ? identity.personnelId : null,
    admin_nom: null
  };
}

async function handleCreate(request, response, identity) {
  const { client_nom, client_telephone = '', montant, date_echeance, magasin_id } = request.body || {};
  const nom = String(client_nom || '').trim().slice(0, 60);
  const telephone = String(client_telephone || '').replace(/\D/g, '').slice(0, 20);
  if (!nom || !Number.isInteger(montant) || montant <= 0) {
    return response.status(400).json({ error: 'Nom du client et montant valide sont requis.' });
  }
  const echeance = String(date_echeance || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(echeance) || Number.isNaN(new Date(echeance).getTime())) {
    return response.status(400).json({ error: 'Date d’échéance invalide.' });
  }
  const store = await resolveStore(magasin_id, identity);
  if (!store) return response.status(400).json({ error: 'Boutique introuvable.' });

  let adminNom = null;
  if (identity.type === 'compte') {
    const { data: compte } = await client.from('comptes').select('nom').eq('id', identity.compteId).maybeSingle();
    adminNom = compte?.nom || null;
  }
  const { personnel_id } = acteur(identity);
  const { data: dette, error } = await client
    .from('dettes')
    .insert({
      compte_id: identity.compteId,
      entreprise_id: store.entreprise_id,
      magasin_id: store.id,
      client_nom: nom,
      client_telephone: telephone || null,
      montant_total: montant,
      montant_paye: 0,
      date_echeance: echeance,
      personnel_id,
      admin_nom: adminNom
    })
    .select('*')
    .single();
  if (error) { console.error('dettes/create:', error.message); return response.status(400).json({ error: 'Création impossible.' }); }
  return response.status(201).json({ dette });
}

async function handlePay(request, response, identity) {
  const { dette_id, montant, mode_paiement } = request.body || {};
  if (!dette_id || !Number.isInteger(montant) || montant <= 0 || !['liquide', 'mobile_money'].includes(mode_paiement)) {
    return response.status(400).json({ error: 'Montant et mode de paiement valides sont requis.' });
  }
  const { data: dette } = await client
    .from('dettes')
    .select('id, entreprise_id, magasin_id, montant_total, montant_paye, annulee')
    .eq('id', dette_id)
    .eq('compte_id', identity.compteId)
    .eq('annulee', false)
    .maybeSingle();
  if (!dette) return response.status(404).json({ error: 'Dette introuvable.' });
  if (identity.type === 'personnel' && dette.magasin_id !== identity.magasinId) {
    return response.status(403).json({ error: 'Dette d’une autre boutique.' });
  }
  const reste = dette.montant_total - dette.montant_paye;
  if (montant > reste) return response.status(400).json({ error: `Le reste à payer est de ${reste}.` });

  let adminNom = null;
  if (identity.type === 'compte') {
    const { data: compte } = await client.from('comptes').select('nom').eq('id', identity.compteId).maybeSingle();
    adminNom = compte?.nom || null;
  }
  const { personnel_id } = acteur(identity);
  const { error: versementError } = await client.from('versements').insert({
    compte_id: identity.compteId,
    entreprise_id: dette.entreprise_id,
    dette_id: dette.id,
    montant,
    mode_paiement,
    personnel_id,
    admin_nom: adminNom
  });
  if (versementError) { console.error('dettes/pay:', versementError.message); return response.status(400).json({ error: 'Encaissement impossible.' }); }
  const { error: detteError } = await client
    .from('dettes')
    .update({ montant_paye: dette.montant_paye + montant })
    .eq('id', dette.id)
    .eq('compte_id', identity.compteId);
  if (detteError) { console.error('dettes/pay-sold:', detteError.message); return response.status(400).json({ error: 'Encaissement impossible.' }); }
  return response.status(200).json({ success: true, reste: reste - montant });
}

async function handleCancel(request, response, identity) {
  if (identity.type !== 'compte') return response.status(403).json({ error: 'Annulation réservée au propriétaire.' });
  const { dette_id } = request.body || {};
  if (!dette_id) return response.status(400).json({ error: 'Dette requise.' });
  const { data: dette, error } = await client
    .from('dettes')
    .update({ annulee: true, annulee_par: identity.compteId, annulee_le: new Date().toISOString() })
    .eq('id', dette_id)
    .eq('compte_id', identity.compteId)
    .eq('annulee', false)
    .select('id')
    .maybeSingle();
  if (error) { console.error('dettes/cancel:', error.message); return response.status(400).json({ error: 'Annulation impossible.' }); }
  if (!dette) return response.status(404).json({ error: 'Dette introuvable ou déjà annulée.' });
  return response.status(200).json({ success: true });
}
