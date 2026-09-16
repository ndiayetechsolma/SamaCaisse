import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { getComptePayload } from './_lib/auth.js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(request, response) {
  if (request.method !== 'PUT' && request.method !== 'PATCH') return response.status(405).json({ error: 'Method not allowed' });

  const payload = await getComptePayload(request);
  if (!payload) return response.status(401).json({ error: 'Session invalide ou expirée.' });

  const { nom, email, password_actuel, nouveau_mot_de_passe } = request.body || {};

  const { data: compte, error: fetchError } = await client
    .from('comptes')
    .select('id, nom, email, mot_de_passe_hash')
    .eq('id', payload.compte_id)
    .maybeSingle();
  if (fetchError) return response.status(500).json({ error: fetchError.message });
  if (!compte) return response.status(404).json({ error: 'Compte introuvable.' });

  const updates = {};

  if (nom !== undefined) {
    const trimmedNom = String(nom).trim();
    if (!trimmedNom) return response.status(400).json({ error: 'Nom invalide.' });
    updates.nom = trimmedNom.slice(0, 80);
  }

  if (email !== undefined) {
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) return response.status(400).json({ error: 'Adresse email invalide.' });
    if (normalizedEmail !== compte.email) {
      const { error: emailError } = await client
        .from('comptes')
        .update({ email: normalizedEmail })
        .eq('id', compte.id);
      if (emailError && emailError.code === '23505') return response.status(409).json({ error: 'Cet email est déjà utilisé.' });
      if (emailError) return response.status(400).json({ error: emailError.message });
      updates.email = normalizedEmail;
    }
  }

  if ((password_actuel !== undefined || nouveau_mot_de_passe !== undefined)) {
    if (String(nouveau_mot_de_passe || '').length < 8) return response.status(400).json({ error: 'Nouveau mot de passe : 8 caractères minimum.' });
    if (!password_actuel || !(await bcrypt.compare(String(password_actuel), compte.mot_de_passe_hash || ''))) {
      return response.status(401).json({ error: 'Mot de passe actuel incorrect.' });
    }
    updates.mot_de_passe_hash = await bcrypt.hash(String(nouveau_mot_de_passe), 12);
  }

  if (Object.keys(updates).length === 0) return response.status(200).json({ compte: { id: compte.id, nom: compte.nom, email: compte.email } });

  const { data: updated, error: updateError } = await client
    .from('comptes')
    .update(updates)
    .eq('id', compte.id)
    .select('id, nom, email')
    .maybeSingle();
  if (updateError) return response.status(400).json({ error: updateError.message });

  return response.status(200).json({ compte: updated });
}