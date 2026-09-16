import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { signCompteToken } from '../_lib/auth.js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  const { email, password } = request.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || String(password || '').length === 0) {
    return response.status(400).json({ error: 'Email et mot de passe sont requis.' });
  }

  const { data: compte, error } = await client
    .from('comptes')
    .select('id, nom, email, cree_le, mot_de_passe_hash')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) return response.status(500).json({ error: error.message });
  if (!compte || !(await bcrypt.compare(String(password), compte.mot_de_passe_hash))) {
    return response.status(401).json({ error: 'Email ou mot de passe incorrect.' });
  }

  const token = await signCompteToken(compte);
  const { mot_de_passe_hash, ...safeCompte } = compte;
  return response.status(200).json({ token, compte: safeCompte });
}