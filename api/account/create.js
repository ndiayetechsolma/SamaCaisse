import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { signCompteToken } from '../_lib/auth.js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  const { nom, email, password } = request.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!nom?.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail) || String(password || '').length < 8) {
    return response.status(400).json({ error: 'Nom, email valide et mot de passe (8 caractères minimum) sont requis.' });
  }

  const mot_de_passe_hash = await bcrypt.hash(String(password), 12);
  const { data: compte, error } = await client
    .from('comptes')
    .insert({ nom: nom.trim().slice(0, 80), mode: 'email', email: normalizedEmail, mot_de_passe_hash })
    .select('id, nom, email, cree_le')
    .single();

  if (error) {
    if (error.code === '23505') return response.status(409).json({ error: 'Cet email est déjà inscrit.' });
    return response.status(400).json({ error: error.message });
  }

  const token = await signCompteToken(compte);
  return response.status(201).json({ token, compte });
}