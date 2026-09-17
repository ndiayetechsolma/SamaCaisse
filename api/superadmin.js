import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { signSuperAdminToken, getSuperAdminPayload } from './_lib/auth.js';

// Client avec la clé service_role : bypass RLS, voit tous les comptes/entreprises.
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(request, response) {
  if (request.method === 'GET') return handleOverview(request, response);
  if (request.method === 'POST') return handlePost(request, response);
  if (request.method === 'DELETE') return handleDelete(request, response);
  return response.status(405).json({ error: 'Method not allowed' });
}

async function handlePost(request, response) {
  const { action } = request.body || {};
  if (action === 'login') return handleLogin(request, response);
  return response.status(400).json({ error: 'Action requise (login).' });
}

async function handleLogin(request, response) {
  const { email, password } = request.body || {};
  if (!email?.trim() || !password) return response.status(400).json({ error: 'Email et mot de passe requis.' });

  const normalizedEmail = String(email).trim().toLowerCase();
  const { data: superAdmin, error } = await client
    .from('super_admins')
    .select('id, email, mot_de_passe_hash')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) return response.status(500).json({ error: error.message });
  if (!superAdmin || !(await bcrypt.compare(String(password), superAdmin.mot_de_passe_hash))) {
    return response.status(401).json({ error: 'Email ou mot de passe incorrect.' });
  }

  const token = await signSuperAdminToken(superAdmin);
  return response.status(200).json({ token });
}

async function handleOverview(request, response) {
  const payload = await getSuperAdminPayload(request);
  if (!payload) return response.status(401).json({ error: 'Session invalide ou expirée.' });

  const { data: comptes, error: comptesError } = await client
    .from('comptes')
    .select('id, nom, email, telephone, cree_le')
    .order('cree_le', { ascending: false });
  if (comptesError) return response.status(500).json({ error: comptesError.message });

  const { data: entreprises, error: entreprisesError } = await client
    .from('entreprises')
    .select('id, compte_id, nom, devise, cree_le, magasins(id)');
  if (entreprisesError) return response.status(500).json({ error: entreprisesError.message });

  // Regroupe les entreprises par compte, avec le nombre de magasins.
  const entreprisesParCompte = new Map();
  for (const entreprise of entreprises) {
    const liste = entreprisesParCompte.get(entreprise.compte_id) || [];
    liste.push({
      id: entreprise.id,
      nom: entreprise.nom,
      devise: entreprise.devise,
      cree_le: entreprise.cree_le,
      nb_magasins: entreprise.magasins?.length || 0
    });
    entreprisesParCompte.set(entreprise.compte_id, liste);
  }

  const resultat = comptes.map(compte => ({
    ...compte,
    entreprises: entreprisesParCompte.get(compte.id) || []
  }));

  return response.status(200).json({
    total_comptes: comptes.length,
    total_entreprises: entreprises.length,
    total_magasins: entreprises.reduce((somme, e) => somme + (e.magasins?.length || 0), 0),
    comptes: resultat
  });
}

async function handleDelete(request, response) {
  const payload = await getSuperAdminPayload(request);
  if (!payload) return response.status(401).json({ error: 'Session invalide ou expirée.' });

  const { cible, id } = request.body || {};
  if (!id || !['entreprise', 'magasin', 'compte'].includes(cible)) {
    return response.status(400).json({ error: 'Cible (entreprise, magasin ou compte) et id requis.' });
  }

  const table = cible === 'entreprise' ? 'entreprises' : cible === 'magasin' ? 'magasins' : 'comptes';
  // Les suppressions en cascade (produits, personnel, ventes, dépenses, caisses,
  // et pour un compte : ses entreprises et magasins) sont gérées par les
  // contraintes "on delete cascade" déjà présentes dans le schéma.
  const { error } = await client.from(table).delete().eq('id', id);
  if (error) return response.status(400).json({ error: error.message });

  return response.status(200).json({ deleted: true });
}