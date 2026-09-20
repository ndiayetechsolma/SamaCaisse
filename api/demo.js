import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { signCompteToken } from './_lib/auth.js';
import { rateLimitStrict } from './_lib/ratelimit.js';
import { checkOrigin } from './_lib/cors.js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const DEMO_EMAIL = 'demo@samacaisse.app';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'demo1234';
const DEMO_COMPTE_NOM = 'Démo';

const seedProduits = [
  { nom: 'Eau minérale 1,5L', categorie: 'Boissons', prix: 500, stock: 120 },
  { nom: 'Riz parfumé 5kg', categorie: 'Alimentation', prix: 4250, stock: 40 },
  { nom: 'Huile végétale 1L', categorie: 'Alimentation', prix: 1600, stock: 55 },
  { nom: 'Sucre 1kg', categorie: 'Alimentation', prix: 900, stock: 30 },
  { nom: 'Savon à lessive', categorie: 'Entretien', prix: 700, stock: 80 },
  { nom: 'Arachide grillée', categorie: 'Épicerie', prix: 350, stock: 100 }
];

const seedVentes = [
  { nom_produit: 'Eau minérale 1,5L', quantite: 2, montant: 1000, mode: 'liquide', jours: 0 },
  { nom_produit: 'Riz parfumé 5kg', quantite: 1, montant: 4250, mode: 'mobile_money', jours: 0 },
  { nom_produit: 'Sucre 1kg', quantite: 2, montant: 1800, mode: 'liquide', jours: 0 },
  { nom_produit: 'Savon à lessive', quantite: 1, montant: 700, mode: 'liquide', jours: 1 },
  { nom_produit: 'Eau minérale 1,5L', quantite: 4, montant: 2000, mode: 'mobile_money', jours: 1 },
  { nom_produit: 'Huile végétale 1L', quantite: 2, montant: 3200, mode: 'liquide', jours: 2 },
  { nom_produit: 'Arachide grillée', quantite: 5, montant: 1750, mode: 'liquide', jours: 2 },
  { nom_produit: 'Riz parfumé 5kg', quantite: 1, montant: 4250, mode: 'mobile_money', jours: 3 },
  { nom_produit: 'Sucre 1kg', quantite: 3, montant: 2700, mode: 'liquide', jours: 3 },
  { nom_produit: 'Eau minérale 1,5L', quantite: 6, montant: 3000, mode: 'liquide', jours: 4 },
  { nom_produit: 'Savon à lessive', quantite: 2, montant: 1400, mode: 'liquide', jours: 5 },
  { nom_produit: 'Huile végétale 1L', quantite: 1, montant: 1600, mode: 'mobile_money', jours: 6 }
];

const seedDepenses = [
  { montant: 1500, motif: 'Transport marchandises', jours: 1 },
  { montant: 3000, motif: 'Fournitures de la boutique', jours: 3 },
  { montant: 5000, motif: 'Électricité', jours: 5 },
  { montant: 20000, motif: 'Réassort (riz, huile)', jours: 6 }
];

export default async function handler(request, response) {
  if (!checkOrigin(request, response)) return;
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });
  if (!(await rateLimitStrict(client, request, { key: 'demo', limit: 20, windowMs: 3600000 })).allowed) {
    return response.status(429).json({ error: 'Trop de démos demandées. Réessayez plus tard.' });
  }

  try {
    let { data: existing } = await client
      .from('comptes')
      .select('id, nom, email, cree_le, mot_de_passe_hash')
      .eq('email', DEMO_EMAIL)
      .maybeSingle();

    // Sandbox auto-nettoyant : passé 24 h, on rase le compte démo (cascade)
    // et on le régénère propre. Borne la pollution à une journée.
    if (existing && Date.now() - new Date(existing.cree_le).getTime() > 86400000) {
      await client.from('comptes').delete().eq('id', existing.id);
      existing = null;
    }

    let compte = existing;
    const now = Date.now();

    if (!compte) {
      const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
      const { data: created, error } = await client
        .from('comptes')
        .insert({ nom: DEMO_COMPTE_NOM, mode: 'email', email: DEMO_EMAIL, mot_de_passe_hash: passwordHash })
        .select('id, nom, email, cree_le')
        .single();
      if (error) { console.error('demo/compte:', error.message); return response.status(500).json({ error: 'Erreur serveur. Réessayez.' }); }
      compte = created;

      const { data: entreprise, error: entrepriseError } = await client
        .from('entreprises')
        .insert({ compte_id: compte.id, nom: 'Boutique Démo', devise: 'FCFA' })
        .select('id')
        .single();
      if (entrepriseError) { console.error('demo/entreprise:', entrepriseError.message); return response.status(500).json({ error: 'Erreur serveur. Réessayez.' }); }

      const { data: magasins, error: magasinsError } = await client
        .from('magasins')
        .insert([
          { compte_id: compte.id, entreprise_id: entreprise.id, nom: 'Point de vente A' },
          { compte_id: compte.id, entreprise_id: entreprise.id, nom: 'Point de vente B' }
        ])
        .select('id, nom');
      if (magasinsError) { console.error('demo/magasins:', magasinsError.message); return response.status(500).json({ error: 'Erreur serveur. Réessayez.' }); }

      const produitsPayload = seedProduits.map(produit => ({
        compte_id: compte.id,
        entreprise_id: entreprise.id,
        nom: produit.nom,
        categorie: produit.categorie,
        prix: produit.prix,
        stock: produit.stock
      }));
      const { error: produitsError } = await client.from('produits').insert(produitsPayload);
      if (produitsError) { console.error('demo/produits:', produitsError.message); return response.status(500).json({ error: 'Erreur serveur. Réessayez.' }); }

      const { data: vendeur, error: vendeurError } = await client
        .from('personnel')
        .insert({
          compte_id: compte.id,
          entreprise_id: entreprise.id,
          magasin_id: magasins[0].id,
          nom: 'Awa (démo)',
          telephone: '0000000000',
          code_pin_hash: await bcrypt.hash('1234', 10),
          role: 'vendeur'
        })
        .select('id');
      if (vendeurError) { console.error('demo/vendeur:', vendeurError.message); return response.status(500).json({ error: 'Erreur serveur. Réessayez.' }); }

      const ventesPayload = seedVentes.map((vente, index) => ({
        compte_id: compte.id,
        entreprise_id: entreprise.id,
        magasin_id: magasins[index % magasins.length].id,
        nom_produit: vente.nom_produit,
        quantite: vente.quantite,
        montant: vente.montant,
        mode_paiement: vente.mode,
        admin_nom: 'Démo',
        date_heure: new Date(now - vente.jours * 86400000 - index * 3600000).toISOString()
      }));
      const { error: ventesError } = await client.from('ventes').insert(ventesPayload);
      if (ventesError) { console.error('demo/ventes:', ventesError.message); return response.status(500).json({ error: 'Erreur serveur. Réessayez.' }); }

      const depensesPayload = seedDepenses.map((depense, index) => ({
        compte_id: compte.id,
        entreprise_id: entreprise.id,
        magasin_id: magasins[index % magasins.length].id,
        montant: depense.montant,
        motif: depense.motif,
        admin_nom: 'Démo',
        date_heure: new Date(now - depense.jours * 86400000 - index * 5400000).toISOString()
      }));
      const { error: depensesError } = await client.from('depenses').insert(depensesPayload);
      if (depensesError) { console.error('demo/depenses:', depensesError.message); return response.status(500).json({ error: 'Erreur serveur. Réessayez.' }); }

      await client.from('caisses').insert([
        {
          compte_id: compte.id,
          entreprise_id: entreprise.id,
          magasin_id: magasins[0].id,
          montant_ouverture: 10000,
          ouverte_par_admin: compte.id
        }
      ]);
    }

    const token = await signCompteToken(compte);
    const { mot_de_passe_hash, ...safeCompte } = compte;
    return response.status(200).json({ token, compte: safeCompte });
  } catch (error) {
    console.error('demo:', error.message);
    return response.status(500).json({ error: 'Erreur serveur. Réessayez.' });
  }
}