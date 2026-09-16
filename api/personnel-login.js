import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { createClient } from '@supabase/supabase-js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const secret = new TextEncoder().encode(process.env.PERSONNEL_SESSION_SECRET || '');
const normalizePhone = value => String(value || '').replace(/\D/g, '');

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });
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