-- ============================================================================
-- SAMA CAISSE — Espace Super-Admin (compte plateforme, séparé des comptes clients)
-- À exécuter UNE SEULE FOIS dans le SQL Editor de ton projet Supabase.
-- ============================================================================

create table public.super_admins (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  mot_de_passe_hash text not null,
  cree_le timestamptz not null default now()
);

create unique index super_admins_email_unique on public.super_admins (lower(email));

-- RLS activé, AUCUNE policy créée : ni anon ni authenticated ne peuvent lire
-- cette table depuis le navigateur. Seule la clé service_role (utilisée par
-- les fonctions Vercel, jamais exposée au client) peut la consulter.
alter table public.super_admins enable row level security;

-- ----------------------------------------------------------------------------
-- Crée ton compte super-admin ici. Remplace l'email et le mot de passe.
-- Le mot de passe doit faire au moins 8 caractères — note-le bien, il n'y a
-- pas d'écran "mot de passe oublié" pour ce compte.
-- ----------------------------------------------------------------------------
insert into public.super_admins (email, mot_de_passe_hash)
values (
  'ton.email@exemple.com',
  crypt('TonMotDePasseSolide123', gen_salt('bf', 12))
);
