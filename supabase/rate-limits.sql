-- ============================================================================
-- SAMA CAISSE — Rate limiting persistant (anti-abus multi-instances)
-- ----------------------------------------------------------------------------
-- À exécuter UNE SEULE FOIS dans le SQL Editor Supabase, APRÈS schema.sql.
-- RLS activée SANS policy : seul service_role lit/écrit (jamais le navigateur).
-- Sans cette table, le code retombe sur la mémoire locale (moins strict).
-- ============================================================================

create table if not exists public.rate_limits (
  cle text primary key,
  compteur integer not null default 1,
  fenetre_debut timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
