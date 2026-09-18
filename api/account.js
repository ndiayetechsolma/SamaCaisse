import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { signCompteToken, getComptePayload } from './_lib/auth.js';
import { rateLimit, isHoneypotFilled, isTooFast } from './_lib/ratelimit.js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(request, response) {
  if (request.method === 'GET') return handleMe(request, response);
  if (request.method === 'POST') return handlePost(request, response);
  if (request.method === 'PATCH') return handleProfile(request, response);
  return response.status(405).json({ error: 'Method not allowed' });
}

async function handleMe(request, response) {
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

async function handlePost(request, response) {
  const { action } = request.body || {};
  if (action === 'create') return handleCreate(request, response);
  if (action === 'login') return handleLogin(request, response);
  if (action === 'onboarding') return handleOnboarding(request, response);
  return response.status(400).json({ error: 'Action requise (create, login, onboarding).' });
}

async function handleCreate(request, response) {
  if (!rateLimit(request, { key: 'compte-create', limit: 5, windowMs: 3600000 }).allowed) {
    return response.status(429).json({ error: 'Trop de tentatives. Réessayez dans une heure.' });
  }
  if (isHoneypotFilled(request.body) || isTooFast(request.body)) {
    return response.status(400).json({ error: 'Requête invalide.' });
  }
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

async function handleLogin(request, response) {
  if (!rateLimit(request, { key: 'compte-login', limit: 20, windowMs: 600000 }).allowed) {
    return response.status(429).json({ error: 'Trop de tentatives. Réessayez dans quelques minutes.' });
  }
  const { email, password } = request.body || {};
  if (!email?.trim() || !password) return response.status(400).json({ error: 'Email et mot de passe requis.' });

  const normalizedEmail = String(email).trim().toLowerCase();
  const { data: compte, error } = await client
    .from('comptes')
    .select('id, nom, email, mot_de_passe_hash, cree_le')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) return response.status(500).json({ error: error.message });
  if (!compte || !(await bcrypt.compare(String(password), compte.mot_de_passe_hash))) {
    return response.status(401).json({ error: 'Email ou mot de passe incorrect.' });
  }

  const token = await signCompteToken({ id: compte.id, nom: compte.nom, email: compte.email });
  return response.status(200).json({ token, compte: { id: compte.id, nom: compte.nom, email: compte.email, cree_le: compte.cree_le } });
}

async function handleOnboarding(request, response) {
  const payload = await getComptePayload(request);
  if (!payload) return response.status(401).json({ error: 'Session invalide ou expirée.' });

  const { entreprise_nom, devise, magasin_nom } = request.body || {};
  const entrepriseNom = String(entreprise_nom || '').trim().slice(0, 60);
  const magasinNom = String(magasin_nom || '').trim().slice(0, 60);
  const effectiveDevise = String(devise || 'FCFA').trim().slice(0, 10) || 'FCFA';
  if (!entrepriseNom || !magasinNom) {
    return response.status(400).json({ error: 'Nom de l\u2019entreprise et nom de la boutique sont requis.' });
  }

  const { data: entreprise, error: entrepriseError } = await client
    .from('entreprises')
    .insert({ compte_id: payload.compte_id, nom: entrepriseNom, devise: effectiveDevise })
    .select('id, nom, devise')
    .single();
  if (entrepriseError) {
    if (entrepriseError.code === '23505') return response.status(400).json({ error: 'Vous possédez déjà une entreprise portant ce nom.' });
    return response.status(400).json({ error: entrepriseError.message });
  }

  const { data: magasin, error: magasinError } = await client
    .from('magasins')
    .insert({ compte_id: payload.compte_id, entreprise_id: entreprise.id, nom: magasinNom })
    .select('id, nom, entreprise_id')
    .single();
  if (magasinError) return response.status(400).json({ error: magasinError.message });

  return response.status(201).json({ entreprise, magasin });
}

async function handleProfile(request, response) {
  const payload = await getComptePayload(request);
  if (!payload) return response.status(401).json({ error: 'Session invalide ou expirée.' });

  const { nom, email, password_actuel, nouveau_mot_de_passe } = request.body || {};
  const updates = {};

  if (nom !== undefined) {
    const trimmed = String(nom).trim();
    if (!trimmed) return response.status(400).json({ error: 'Nom invalide.' });
    updates.nom = trimmed.slice(0, 80);
  }

  if (email !== undefined) {
    const normalized = String(email).trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) return response.status(400).json({ error: 'Email invalide.' });
    const { data: existing } = await client.from('comptes').select('id').eq('email', normalized).neq('id', payload.compte_id).maybeSingle();
    if (existing) return response.status(409).json({ error: 'Cet email est déjà utilisé par un autre compte.' });
    updates.email = normalized;
  }

  if (nouveau_mot_de_passe) {
    if (!password_actuel) return response.status(400).json({ error: 'Mot de passe actuel requis pour changer le mot de passe.' });
    if (String(nouveau_mot_de_passe).length < 8) return response.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 8 caractères.' });
    const { data: compte } = await client.from('comptes').select('mot_de_passe_hash').eq('id', payload.compte_id).maybeSingle();
    if (!compte || !(await bcrypt.compare(String(password_actuel), compte.mot_de_passe_hash))) {
      return response.status(401).json({ error: 'Mot de passe actuel incorrect.' });
    }
    updates.mot_de_passe_hash = await bcrypt.hash(String(nouveau_mot_de_passe), 12);
  }

  if (Object.keys(updates).length === 0) return response.status(400).json({ error: 'Aucune modification fournie.' });

  const { data: compte, error } = await client
    .from('comptes')
    .update(updates)
    .eq('id', payload.compte_id)
    .select('id, nom, email, cree_le')
    .maybeSingle();
  if (error) return response.status(400).json({ error: error.message });

  return response.status(200).json({ compte });
}
