import { createClient } from '@supabase/supabase-js';
import { getComptePayload } from '../_lib/auth.js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed' });

  const payload = await getComptePayload(request);
  if (!payload) return response.status(401).json({ error: 'Session invalide ou expirée.' });

  const { data: compte, error } = await client
    .from('comptes')
    .select('id, nom, email, cree_le')
    .eq('id', payload.compte_id)
    .maybeSingle();
  if (error) return response.status(500).json({ error: error.message });
  if (!compte) return response.status(401).json({ error: 'Compte introuvable.' });

  const { data: entreprises, error: entreprisesError } = await client
    .from('entreprises')
    .select('id, nom, devise, magasins(id, nom)')
    .eq('compte_id', compte.id)
    .order('nom');
  if (entreprisesError) return response.status(500).json({ error: entreprisesError.message });

  return response.status(200).json({ compte, entreprises });
}