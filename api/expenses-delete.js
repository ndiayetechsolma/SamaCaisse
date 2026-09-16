import { createClient } from '@supabase/supabase-js';
import { getSession } from './_lib/auth.js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  const { identity } = await getSession(request);
  if (!identity) return response.status(401).json({ error: 'Session invalide ou expirée.' });
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