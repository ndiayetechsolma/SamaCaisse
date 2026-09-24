-- ============================================================================
-- SAMA CAISSE — Dettes clients (ventes à crédit + recouvrement)
-- ----------------------------------------------------------------------------
-- À exécuter UNE SEULE FOIS dans le SQL Editor Supabase, APRÈS schema.sql.
-- RLS activée SANS policy : seul service_role y touche via /api/dettes.
-- ============================================================================

-- Nouveau mode de paiement pour les ventes à crédit (non encaissé en caisse).
alter type public.payment_method add value if not exists 'credit';

create table if not exists public.dettes (
  id uuid primary key default gen_random_uuid(),
  compte_id uuid not null references public.comptes(id) on delete cascade,
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  magasin_id uuid not null references public.magasins(id) on delete cascade,
  vente_id uuid references public.ventes(id) on delete set null,
  client_nom text not null,
  client_telephone text,
  montant_total integer not null check (montant_total > 0),
  montant_paye integer not null default 0 check (montant_paye >= 0),
  date_echeance date not null,
  personnel_id uuid references public.personnel(id) on delete set null,
  admin_nom text,
  annulee boolean not null default false,
  annulee_par uuid references public.comptes(id) on delete set null,
  annulee_le timestamptz,
  cree_le timestamptz not null default now(),
  constraint dettes_paye_check check (montant_paye <= montant_total)
);

create table if not exists public.versements (
  id uuid primary key default gen_random_uuid(),
  compte_id uuid not null references public.comptes(id) on delete cascade,
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  dette_id uuid not null references public.dettes(id) on delete cascade,
  montant integer not null check (montant > 0),
  mode_paiement public.payment_method not null,
  personnel_id uuid references public.personnel(id) on delete set null,
  admin_nom text,
  date_heure timestamptz not null default now(),
  cree_le timestamptz not null default now()
);

alter table public.dettes enable row level security;
alter table public.versements enable row level security;

create index if not exists dettes_compte_idx on public.dettes (compte_id);
create index if not exists dettes_magasin_date_idx on public.dettes (magasin_id, date_echeance);
create index if not exists versements_dette_idx on public.versements (dette_id);
