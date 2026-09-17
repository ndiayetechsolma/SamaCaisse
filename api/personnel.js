import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { createClient } from '@supabase/supabase-js';
import { getSession } from './_lib/auth.js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const secret = new TextEncoder().encode(process.env.PERSONNEL_SESSION_SECRET || '');
const normalizePhone = value => String(value || '').replace(/\D/g, '');

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  const { action } = request.body || {};
  if (action === 'login') return handleLogin(request, response);
  if (action === 'create') return handleCreate(request, response);
  if (action === 'update') return handleUpdate(request, response);
  if (action === 'toggle') return handleToggle(request, response);
  return response.status(400).json({ error: 'Action requise (login, create, update, toggle).' });
}

async function handleLogin(request, response) {
  if (!process.env.PERSONNEL_SESSION_SECRET) return response.status(500).json({ error: 'Personnel session secret is not configured' });

  const { telephone, pin } = request.body || {};
  const normalizedTelephone = normalizePhone(telephone);
  if (!normalizedTelephone || !/^\d{4}$/.test(String(pin || ''))) return response.status(400).json({ error: 'Téléphone et code à 4 chiffres sont requis.' });

  const { data: personnelRows, error } = await client
    .from('personnel')
    .select('id, nom, role, magasin_id, compte_id, code_pin_hash, telephone, magasins(nom, entreprise_id, compte_id)')
    .eq('actif', true);
  if (error) return response.status(500).json({ error: error.message });

  const row = (personnelRows || []).find(personnel => normalizePhone(personnel.telephone) === normalizedTelephone);
  if (!row || !(await bcrypt.compare(String(pin), row.code_pin_hash))) return response.status(401).json({ error: 'Invalid credentials' });

  const token = await new SignJWT({
    type: 'personnel',
    role: 'authenticated',
    personnelId: row.id,
    personnel_id: row.id,
    magasinId: row.magasin_id,
    magasin_id: row.magasin_id,
    compteId: row.compte_id,
    compte_id: row.compte_id,
    entrepriseId: row.magasins?.entreprise_id || null,
    entreprise_id: row.magasins?.entreprise_id || null,
    nom: row.nom,
    rolePersonnel: row.role
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(row.id)
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret);

  return response.status(200).json({
    token,
    personnel: {
      id: row.id,
      nom: row.nom,
      role: row.role,
      magasin_id: row.magasin_id,
      magasin_nom: row.magasins?.nom || '',
      entreprise_id: row.magasins?.entreprise_id || null,
      compte_id: row.compte_id
    }
  });
}

async function handleCreate(request, response) {
  const { identity } = await getSession(request);
  if (!identity) return response.status(401).json({ error: 'Session invalide ou expirée.' });
  if (identity.type !== 'compte') return response.status(403).json({ error: 'Réservé au propriétaire.' });

  const { nom, telephone, pin, magasin_id } = request.body || {};
  const trimmedNom = String(nom || '').trim();
  const normalizedTelephone = normalizePhone(telephone);
  if (!trimmedNom || !/^\d{8,12}$/.test(normalizedTelephone) || !/^\d{4}$/.test(String(pin || '')) || !magasin_id) {
    return response.status(400).json({ error: 'Nom, téléphone (8–12 chiffres), code à 4 chiffres et boutique sont requis.' });
  }

  const { data: store } = await client
    .from('magasins')
    .select('id, entreprise_id')
    .eq('id', magasin_id)
    .eq('compte_id', identity.compteId)
    .maybeSingle();
  if (!store) return response.status(400).json({ error: 'Boutique introuvable.' });

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
    .select('id, nom, telephone, role, magasin_id, actif, cree_le')
    .single();
  if (error) return response.status(400).json({ error: error.message });

  return response.status(201).json({ membre: member });
}

async function handleUpdate(request, response) {
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
    if (!magasin_id) return response.status(400).json({ error: 'Boutique requise.' });
    const { data: store } = await client
      .from('magasins')
      .select('id, entreprise_id')
      .eq('id', magasin_id)
      .eq('compte_id', identity.compteId)
      .maybeSingle();
    if (!store) return response.status(400).json({ error: 'Boutique introuvable.' });
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

async function handleToggle(request, response) {
  const { identity } = await getSession(request);
  if (!identity) return response.status(401).json({ error: 'Session invalide ou expirée.' });
  if (identity.type !== 'compte') return response.status(403).json({ error: 'Réservé au propriétaire.' });

  const { personnel_id, actif } = request.body || {};
  if (!personnel_id || typeof actif !== 'boolean') return response.status(400).json({ error: 'Membre et état requis.' });

  const { data: member, error } = await client
    .from('personnel')
    .update({ actif })
    .eq('id', personnel_id)
    .eq('compte_id', identity.compteId)
    .select('id, nom, actif')
    .maybeSingle();
  if (error) return response.status(400).json({ error: error.message });
  if (!member) return response.status(404).json({ error: 'Membre introuvable.' });

  return response.status(200).json({ membre: member });
}
