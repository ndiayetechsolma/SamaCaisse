import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { getSession } from './_lib/auth.js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const normalizePhone = value => String(value || '').replace(/\D/g, '');

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  const { identity } = await getSession(request);
  if (!identity) return response.status(401).json({ error: 'Session invalide ou expirée.' });
  if (identity.type !== 'compte') return response.status(403).json({ error: 'Réservé au propriétaire.' });

  const { nom, telephone, pin, magasin_id } = request.body || {};
  const trimmedNom = String(nom || '').trim();
  const normalizedTelephone = normalizePhone(telephone);
  if (!trimmedNom || !/^\d{8,12}$/.test(normalizedTelephone) || !/^\d{4}$/.test(String(pin || '')) || !magasin_id) {
    return response.status(400).json({ error: 'Nom, téléphone (8–12 chiffres), code à 4 chiffres et magasin sont requis.' });
  }

  const { data: store } = await client
    .from('magasins')
    .select('id, entreprise_id')
    .eq('id', magasin_id)
    .eq('compte_id', identity.compteId)
    .maybeSingle();
  if (!store) return response.status(400).json({ error: 'Magasin introuvable.' });

  const { data: existing } = await client
    .from('personnel')
    .select('id')
    .eq('compte_id', identity.compteId)
    .eq('telephone', normalizedTelephone)
    .maybeSingle();
  if (existing) return response.status(409).json({ error: 'Ce numéro de téléphone est déjà utilisé dans votre entreprise.' });

  const code_pin_hash = await bcrypt.hash(String(pin), 12);

  const { data: member, error } = await client
    .from('personnel')
    .insert({
      compte_id: identity.compteId,
      entreprise_id: store.entreprise_id,
      magasin_id: store.id,
      nom: trimmedNom.slice(0, 60),
      telephone: normalizedTelephone,
      code_pin_hash
    })
    .select('id, nom, telephone, role, magasin_id, actif, created_at')
    .single();
  if (error) return response.status(400).json({ error: error.message });

  return response.status(201).json({ membre: member });
}