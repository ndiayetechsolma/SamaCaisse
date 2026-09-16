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

  const { personnel_id, nom, telephone, pin, magasin_id } = request.body || {};
  if (!personnel_id) return response.status(400).json({ error: 'Membre requis.' });

  const { data: existing } = await client
    .from('personnel')
    .select('id, compte_id')
    .eq('id', personnel_id)
    .eq('compte_id', identity.compteId)
    .maybeSingle();
  if (!existing) return response.status(404).json({ error: 'Membre introuvable.' });

  const updates = {};

  if (nom !== undefined) {
    const trimmed = String(nom).trim();
    if (!trimmed) return response.status(400).json({ error: 'Nom invalide.' });
    updates.nom = trimmed.slice(0, 60);
  }

  if (telephone !== undefined) {
    const normalized = normalizePhone(telephone);
    if (!/^\d{8,12}$/.test(normalized)) return response.status(400).json({ error: 'Téléphone invalide (8–12 chiffres).' });
    const { data: taken } = await client
      .from('personnel')
      .select('id')
      .eq('compte_id', identity.compteId)
      .eq('telephone', normalized)
      .neq('id', personnel_id)
      .maybeSingle();
    if (taken) return response.status(409).json({ error: 'Ce numéro de téléphone est déjà utilisé dans votre entreprise.' });
    updates.telephone = normalized;
  }

  if (pin !== undefined) {
    if (!/^\d{4}$/.test(String(pin))) return response.status(400).json({ error: 'Code à 4 chiffres requis.' });
    updates.code_pin_hash = await bcrypt.hash(String(pin), 12);
  }

  if (magasin_id !== undefined) {
    if (!magasin_id) return response.status(400).json({ error: 'Magasin requis.' });
    const { data: store } = await client
      .from('magasins')
      .select('id, entreprise_id')
      .eq('id', magasin_id)
      .eq('compte_id', identity.compteId)
      .maybeSingle();
    if (!store) return response.status(400).json({ error: 'Magasin introuvable.' });
    updates.magasin_id = store.id;
    updates.entreprise_id = store.entreprise_id;
  }

  if (Object.keys(updates).length === 0) return response.status(200).json({ membre: existing });

  const { data: member, error } = await client
    .from('personnel')
    .update(updates)
    .eq('id', personnel_id)
    .eq('compte_id', identity.compteId)
    .select('id, nom, telephone, role, magasin_id, actif')
    .maybeSingle();
  if (error) return response.status(400).json({ error: error.message });

  return response.status(200).json({ membre: member });
}