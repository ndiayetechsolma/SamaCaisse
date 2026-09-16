-- ============================================================================
-- SAMA CAISSE — Schéma multi-tenant
-- ----------------------------------------------------------------------------
-- À exécuter dans le SQL Editor de ton projet Supabase (projet DÉDIÉ à
-- SamaCaisse, distinct de ton projet Solma Shop).
--
-- Objectif : chaque personne inscrite devient « propriétaire » de son espace.
-- Toutes les tables portent compte_id (-> comptes) pour garantir l'isolation
-- entre utilisateurs. Les politiques RLS refusent tout accès en dehors de son
-- propre compte.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Types
-- ----------------------------------------------------------------------------

create type public.compte_mode as enum ('telephone', 'email');
create type public.personnel_role as enum ('vendeur', 'admin');
create type public.payment_method as enum ('liquide', 'mobile_money');

-- ----------------------------------------------------------------------------
-- Comptes (les propriétaires, anciennement « admins » + auth.users)
-- ----------------------------------------------------------------------------

create table public.comptes (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  mode public.compte_mode not null,
  telephone text,
  email text,
  code_pin_hash text,
  mot_de_passe_hash text,
  plan text not null default 'gratuit',
  cree_le timestamptz not null default now(),
  constraint comptes_identifiants_check check (
    (mode = 'telephone' and telephone is not null and code_pin_hash is not null and email is null)
    or (mode = 'email' and email is not null and mot_de_passe_hash is not null and telephone is null)
  )
);

create unique index comptes_telephone_unique on public.comptes (telephone) where telephone is not null;
create unique index comptes_email_unique on public.comptes (lower(email)) where email is not null;

-- ----------------------------------------------------------------------------
-- Entreprises (le « tenant » : une entreprise appartient à un compte)
-- ----------------------------------------------------------------------------

create table public.entreprises (
  id uuid primary key default gen_random_uuid(),
  compte_id uuid not null references public.comptes(id) on delete cascade,
  nom text not null,
  devise text not null default 'FCFA',
  cree_le timestamptz not null default now(),
  unique (compte_id, nom)
);

-- ----------------------------------------------------------------------------
-- Magasins (points de vente d'une entreprise)
-- ----------------------------------------------------------------------------

create table public.magasins (
  id uuid primary key default gen_random_uuid(),
  compte_id uuid not null references public.comptes(id) on delete cascade,
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  nom text not null,
  cree_le timestamptz not null default now(),
  unique (entreprise_id, nom)
);

-- ----------------------------------------------------------------------------
-- Produits (catalogue de l'entreprise, avec catégorie et stock)
-- ----------------------------------------------------------------------------
-- magasin_id : NULL = produit commun à tous les magasins de l'entreprise ;
-- renseigné = produit propre à un magasin précis.

create table public.produits (
  id uuid primary key default gen_random_uuid(),
  compte_id uuid not null references public.comptes(id) on delete cascade,
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  magasin_id uuid references public.magasins(id) on delete cascade,
  nom text not null,
  categorie text,
  prix integer not null check (prix > 0),
  stock integer not null default 0 check (stock >= 0),
  actif boolean not null default true,
  cree_le timestamptz not null default now()
);

-- Un même nom n'apparaît qu'une seule fois par entreprise :
-- soit comme produit commun (magasin_id null), soit par magasin.
create unique index produits_communs_unique
  on public.produits (entreprise_id, nom)
  where magasin_id is null;
create unique index produits_par_magasin_unique
  on public.produits (entreprise_id, nom, magasin_id)
  where magasin_id is not null;

-- ----------------------------------------------------------------------------
-- Personnel (équipe d'une entreprise, connexion téléphone + PIN)
-- ----------------------------------------------------------------------------

create table public.personnel (
  id uuid primary key default gen_random_uuid(),
  compte_id uuid not null references public.comptes(id) on delete cascade,
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  magasin_id uuid not null references public.magasins(id) on delete cascade,
  nom text not null,
  telephone text not null,
  code_pin_hash text not null,
  role public.personnel_role not null default 'vendeur',
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  unique (entreprise_id, telephone)
);

-- ----------------------------------------------------------------------------
-- Ventes
-- ----------------------------------------------------------------------------

create table public.ventes (
  id uuid primary key default gen_random_uuid(),
  compte_id uuid not null references public.comptes(id) on delete cascade,
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  magasin_id uuid not null references public.magasins(id) on delete cascade,
  produit_id uuid references public.produits(id) on delete set null,
  nom_produit text not null,
  quantite integer not null default 1 check (quantite > 0),
  montant integer not null check (montant > 0),
  mode_paiement public.payment_method not null,
  personnel_id uuid references public.personnel(id) on delete set null,
  admin_nom text,
  date_heure timestamptz not null default now(),
  annulee boolean not null default false,
  annulee_par uuid references public.comptes(id) on delete set null,
  annulee_le timestamptz,
  cree_le timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Dépenses
-- ----------------------------------------------------------------------------

create table public.depenses (
  id uuid primary key default gen_random_uuid(),
  compte_id uuid not null references public.comptes(id) on delete cascade,
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  magasin_id uuid not null references public.magasins(id) on delete cascade,
  montant integer not null check (montant > 0),
  motif text not null,
  personnel_id uuid references public.personnel(id) on delete set null,
  admin_nom text,
  date_heure timestamptz not null default now(),
  annulee boolean not null default false,
  annulee_par uuid references public.comptes(id) on delete set null,
  annulee_le timestamptz,
  cree_le timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Caisses (une seule caisse ouverte par magasin)
-- ----------------------------------------------------------------------------

create table public.caisses (
  id uuid primary key default gen_random_uuid(),
  compte_id uuid not null references public.comptes(id) on delete cascade,
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  magasin_id uuid not null references public.magasins(id) on delete cascade,
  montant_ouverture integer not null check (montant_ouverture >= 0),
  solde_theorique integer check (solde_theorique >= 0),
  montant_fermeture integer check (montant_fermeture >= 0),
  ecart integer,
  ouverte_par uuid references public.personnel(id) on delete set null,
  ouverte_par_admin uuid references public.comptes(id) on delete set null,
  fermee_par uuid references public.personnel(id) on delete set null,
  fermee_par_admin uuid references public.comptes(id) on delete set null,
  date_ouverture timestamptz not null default now(),
  date_fermeture timestamptz,
  constraint caisse_dates_check check (date_fermeture is null or date_fermeture >= date_ouverture),
  constraint caisse_opened_by_check check ((ouverte_par is not null) <> (ouverte_par_admin is not null))
);

create unique index one_open_cash_register_per_store
  on public.caisses (magasin_id)
  where date_fermeture is null;

-- ----------------------------------------------------------------------------
-- Index de recherche
-- ----------------------------------------------------------------------------

create index comptes_cree_le_idx on public.comptes (cree_le desc);
create index entreprises_compte_idx on public.entreprises (compte_id);
create index magasins_entreprise_idx on public.magasins (entreprise_id);
create index magasins_compte_idx on public.magasins (compte_id);
create index produits_entreprise_idx on public.produits (entreprise_id);
create index produits_magasin_idx on public.produits (magasin_id) where magasin_id is not null;
create index personnel_entreprise_idx on public.personnel (entreprise_id, magasin_id);
create index ventes_magasin_date_idx on public.ventes (magasin_id, date_heure desc);
create index ventes_compte_idx on public.ventes (compte_id);
create index depenses_magasin_date_idx on public.depenses (magasin_id, date_heure desc);
create index depenses_compte_idx on public.depenses (compte_id);
create index caisses_magasin_date_idx on public.caisses (magasin_id, date_ouverture desc);

-- ============================================================================
-- Isolation des données (RLS)
-- ============================================================================
-- La fonction lit le compte connecté dans le JWT signé par l'application.
-- Sans JWT valide (compte_id) : null -> toutes les politiques refusent l'accès.

create or replace function public.compte_connecte()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select nullif(auth.jwt() ->> 'compte_id', '')::uuid;
$$;

alter table public.comptes enable row level security;
alter table public.entreprises enable row level security;
alter table public.magasins enable row level security;
alter table public.produits enable row level security;
alter table public.personnel enable row level security;
alter table public.ventes enable row level security;
alter table public.depenses enable row level security;
alter table public.caisses enable row level security;

-- Un propriétaire n'accède qu'à son propre compte.
create policy comptes_select_propre on public.comptes
  for select to authenticated
  using (id = public.compte_connecte());
create policy comptes_update_propre on public.comptes
  for update to authenticated
  using (id = public.compte_connecte())
  with check (id = public.compte_connecte());

-- Toutes les tables métier : uniquement les lignes du compte connecté.
create policy entreprises_acces on public.entreprises
  for all to authenticated
  using (compte_id = public.compte_connecte())
  with check (compte_id = public.compte_connecte());

create policy magasins_acces on public.magasins
  for all to authenticated
  using (compte_id = public.compte_connecte())
  with check (compte_id = public.compte_connecte());

create policy produits_acces on public.produits
  for all to authenticated
  using (compte_id = public.compte_connecte())
  with check (compte_id = public.compte_connecte());

create policy personnel_acces on public.personnel
  for all to authenticated
  using (compte_id = public.compte_connecte())
  with check (compte_id = public.compte_connecte());

create policy ventes_acces on public.ventes
  for all to authenticated
  using (compte_id = public.compte_connecte())
  with check (compte_id = public.compte_connecte());

create policy depenses_acces on public.depenses
  for all to authenticated
  using (compte_id = public.compte_connecte())
  with check (compte_id = public.compte_connecte());

create policy caisses_acces on public.caisses
  for all to authenticated
  using (compte_id = public.compte_connecte())
  with check (compte_id = public.compte_connecte());

-- ============================================================================
-- Remarque : aucune politique « anon » n'est créée. Hors session, rien n'est
-- lisible. Les opérations quotidiennes passeront par les routes serveur Vercel
-- (clé service_role) qui forceront toujours le compte_id du JWT.
-- ============================================================================