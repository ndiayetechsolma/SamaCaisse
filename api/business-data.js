import { createClient } from '@supabase/supabase-js';
import { getSession } from './_lib/auth.js';
import { checkOrigin } from './_lib/cors.js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(request, response) {
  if (!checkOrigin(request, response)) return;
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed' });

  const { identity } = await getSession(request);
  if (!identity) return response.status(401).json({ error: 'Session invalide ou expirée.' });

  const compteId = identity.compteId;
  let entrepriseId = identity.entrepriseId;
  const magasinId = identity.magasinId || null;

  if (!entrepriseId) {
    entrepriseId = String(request.query.entreprise_id || '');
    const { data: owned, error } = await client
      .from('entreprises')
      .select('id')
      .eq('id', entrepriseId)
      .eq('compte_id', compteId)
      .maybeSingle();
    if (error) { console.error('business-data/entreprise:', error.message); return response.status(500).json({ error: 'Erreur serveur. Réessayez.' }); }
    if (!owned) return response.status(403).json({ error: 'Entreprise introuvable.' });
  }

  const storeScope = magasinId ? query => query.eq('magasin_id', magasinId) : query => query;
  // Un vendeur ne voit que sa boutique : catalogue restreint + lui seul dans l'équipe.
  const isSeller = identity.type === 'personnel';
  const sellerCommonScope = (query) => {
    if (!isSeller || !magasinId) return query;
    return query.or(`magasin_id.eq.${magasinId},magasin_id.is.null`);
  };

const [entrepriseResult, magasinsResult, produitsResult, ventesResult, depensesResult, caissesResult, personnelResult] = await Promise.all([
    client.from('entreprises').select('id, nom, devise').eq('id', entrepriseId).eq('compte_id', compteId).maybeSingle(),
    (isSeller && magasinId
      ? client.from('magasins').select('id, nom').eq('id', magasinId).eq('compte_id', compteId)
      : client.from('magasins').select('id, nom').eq('compte_id', compteId).eq('entreprise_id', entrepriseId).order('nom')),
    sellerCommonScope(client.from('produits').select('*, magasins(nom)').eq('compte_id', compteId).eq('entreprise_id', entrepriseId)).order('nom'),
    storeScope(client.from('ventes').select('*, magasins(nom), personnel(nom)').eq('compte_id', compteId).eq('entreprise_id', entrepriseId)).order('date_heure', { ascending: false }),
    storeScope(client.from('depenses').select('*, magasins(nom), personnel(nom)').eq('compte_id', compteId).eq('entreprise_id', entrepriseId)).order('date_heure', { ascending: false }),
    storeScope(client.from('caisses').select('*, magasins(nom)').eq('compte_id', compteId).eq('entreprise_id', entrepriseId)).order('date_ouverture', { ascending: false }).limit(150),
    (isSeller && identity.personnelId
      ? client.from('personnel').select('id, nom, role, magasin_id, actif').eq('id', identity.personnelId).eq('compte_id', compteId)
      : client.from('personnel').select('id, nom, role, telephone, magasin_id, actif').eq('compte_id', compteId).eq('entreprise_id', entrepriseId).order('nom'))
  ]);

  const failing = [entrepriseResult, magasinsResult, produitsResult, ventesResult, depensesResult, caissesResult, personnelResult].find(result => result.error);
  if (failing) { console.error('business-data:', failing.error.message); return response.status(500).json({ error: 'Erreur serveur. Réessayez.' }); }

  return response.status(200).json({
    entreprise: entrepriseResult.data || { id: null, nom: '', devise: 'FCFA' },
    magasins: magasinsResult.data || [],
    produits: produitsResult.data || [],
    ventes: ventesResult.data || [],
    depenses: depensesResult.data || [],
    caisses: caissesResult.data || [],
    personnel: personnelResult.data || []
  });
}