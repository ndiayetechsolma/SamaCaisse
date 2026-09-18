-- ============================================================================
-- SAMA CAISSE — Mesure d'audience first-party (sans cookie tiers)
-- ----------------------------------------------------------------------------
-- À exécuter UNE SEULE FOIS dans le SQL Editor Supabase, APRÈS schema.sql.
-- Table verrouillée (RLS sans policy) : seul service_role écrit via /api/analytics.
-- ============================================================================

create table public.visites (
  jour date not null,
  page text not null,
  compteur integer not null default 1,
  primary key (jour, page)
);

alter table public.visites enable row level security;

create or replace function public.enregistrer_visite(p_page text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.visites (jour, page, compteur)
  values (current_date, p_page, 1)
  on conflict (jour, page)
  do update set compteur = public.visites.compteur + 1;
end;
$$;
