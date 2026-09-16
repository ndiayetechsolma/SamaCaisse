-- ============================================================================
-- SAMA CAISSE — Test rapide de l'isolation (RLS)
-- ----------------------------------------------------------------------------
-- À coller dans le SQL Editor du projet Supabase DÉDIÉ à SamaCaisse.
--
-- Ce script :
--   1. recrée 2 comptes factices (A et B) avec quelques lignes de données ;
--   2. simule la connexion de « Compte A » (rôle authenticated + JWT) ;
--   3. vérifie que A ne voit que SES lignes et jamais celles de B ;
--   4. vérifie qu'un visiteur anonyme ne voit rien ;
--   5. nettoie tout : aucune donnée de test ne reste en base.
--
-- Les requêtes affichent des nombres : c'est eux que tu vérifies.
-- ============================================================================

begin;

-- --------------------------------------------------------------------------
-- 1. Nettoyage préalable (au cas où un test précédent aurait laissé des traces)
-- --------------------------------------------------------------------------
delete from public.caisses   where compte_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
delete from public.depenses  where compte_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
delete from public.ventes    where compte_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
delete from public.personnel where compte_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
delete from public.produits  where compte_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
delete from public.magasins  where compte_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
delete from public.entreprises where compte_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
delete from public.comptes   where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');

-- --------------------------------------------------------------------------
-- 2. Données factices : compte A (1 entreprise, 1 magasin, produits, ventes…)
-- --------------------------------------------------------------------------
insert into public.comptes (id, nom, mode, email, mot_de_passe_hash) values
  ('00000000-0000-0000-0000-00000000000a', 'Compte A', 'email', 'a@test.local', 'hash-a'),
  ('00000000-0000-0000-0000-00000000000b', 'Compte B', 'email', 'b@test.local', 'hash-b');

insert into public.entreprises (id, compte_id, nom) values
  ('00000000-0000-0000-0000-00000010a1', '00000000-0000-0000-0000-00000000000a', 'Entreprise A'),
  ('00000000-0000-0000-0000-00000010b1', '00000000-0000-0000-0000-00000000000b', 'Entreprise B');

insert into public.magasins (id, compte_id, entreprise_id, nom) values
  ('00000000-0000-0000-0000-00000020a1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000010a1', 'Magasin A'),
  ('00000000-0000-0000-0000-00000020b1', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000010b1', 'Magasin B');

insert into public.produits (id, compte_id, entreprise_id, magasin_id, nom, prix, stock) values
  ('00000000-0000-0000-0000-00000030a1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000010a1', '00000000-0000-0000-0000-00000020a1', 'Riz 5kg', 8000, 50),
  ('00000000-0000-0000-0000-00000030b1', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000010b1', '00000000-0000-0000-0000-00000020b1', 'Huile 1L', 3500, 20);

insert into public.ventes (id, compte_id, entreprise_id, magasin_id, nom_produit, montant, mode_paiement) values
  ('00000000-0000-0000-0000-00000040a1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000010a1', '00000000-0000-0000-0000-00000020a1', 'Riz 5kg', 8000, 'liquide'),
  ('00000000-0000-0000-0000-00000040b1', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000010b1', '00000000-0000-0000-0000-00000020b1', 'Huile 1L', 3500, 'mobile_money');

insert into public.depenses (id, compte_id, entreprise_id, magasin_id, montant, motif) values
  ('00000000-0000-0000-0000-00000050a1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000010a1', '00000000-0000-0000-0000-00000020a1', 1000, 'Transport');

insert into public.caisses (id, compte_id, entreprise_id, magasin_id, montant_ouverture, solde_theorique, ouverte_par_admin, date_ouverture) values
  ('00000000-0000-0000-0000-00000060a1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000010a1', '00000000-0000-0000-0000-00000020a1', 0, 8000, '00000000-0000-0000-0000-00000000000a', now());

-- --------------------------------------------------------------------------
-- 3. Simulation : connexion en tant que « Compte A » (JWT signé)
-- --------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000a","compte_id":"00000000-0000-0000-0000-00000000000a"}',
  true);

select 'TEST 1 - A ne voit que SES entreprise/magasin/produit/vente/depense/caisse' as test;
select count(*) as nb_d_entreprise_attendue_1 from public.entreprises; -- → 1
select count(*) as nb_de_magasins_attendus_1 from public.magasins;     -- → 1
select count(*) as nb_de_produits_attendus_1 from public.produits;     -- → 1
select count(*) as nb_de_ventes_attendues_1 from public.ventes;        -- → 1
select count(*) as nb_de_depenses_attendues_1 from public.depenses;    -- → 1
select count(*) as nb_de_caisses_attendues_1 from public.caisses;      -- → 1
select count(*) as nb_de_comptes_visibles_1 from public.comptes;       -- → 1 (lui-même)

select 'TEST 2 - A ne peut PAS voir les lignes de B' as test;
select count(*) as ventes_de_B_visibles_par_A_attendues_0 from public.ventes
  where compte_id = '00000000-0000-0000-0000-00000000000b';            -- → 0
select count(*) as produits_de_B_visibles_par_A_attendus_0 from public.produits
  where compte_id = '00000000-0000-0000-0000-00000000000b';            -- → 0

select 'TEST 3 - A ne peut pas MODIFIER les lignes de B' as test;
update public.produits set prix = 1
  where compte_id = '00000000-0000-0000-0000-00000000000b';            -- → aucune ligne modifiée

select 'TEST 4 - Un visiteur anonyme ne voit rien' as test;
reset role;
set local role anon;
select count(*) as ventes_visibles_par_anon_attendues_0 from public.ventes;      -- → 0
select count(*) as comptes_visibles_par_anon_attendus_0 from public.comptes;     -- → 0

-- --------------------------------------------------------------------------
-- 4. Nettoyage intégral des données de test
-- --------------------------------------------------------------------------
reset role;
delete from public.caisses   where compte_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
delete from public.depenses  where compte_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
delete from public.ventes    where compte_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
delete from public.produits  where compte_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
delete from public.magasins  where compte_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
delete from public.entreprises where compte_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
delete from public.comptes   where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');

select 'TEST 5 - Nettoyage effectue' as test;

commit;