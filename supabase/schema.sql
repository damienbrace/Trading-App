-- Trading App production schema for Supabase.
-- Run this in the Supabase SQL editor after creating a project.
-- All app-owned tables use Row Level Security scoped to auth.uid().

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create table if not exists public.journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  currency text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journals_user_id_idx on public.journals(user_id);

alter table public.journals enable row level security;

create policy "journals_select_own"
  on public.journals for select
  using (user_id = auth.uid());

create policy "journals_insert_own"
  on public.journals for insert
  with check (user_id = auth.uid());

create policy "journals_update_own"
  on public.journals for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "journals_delete_own"
  on public.journals for delete
  using (user_id = auth.uid());

create table if not exists public.csv_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text,
  storage_path text,
  imported_at timestamptz not null default now()
);

create index if not exists csv_imports_user_id_idx on public.csv_imports(user_id);

alter table public.csv_imports enable row level security;

create policy "csv_imports_select_own"
  on public.csv_imports for select
  using (user_id = auth.uid());

create policy "csv_imports_insert_own"
  on public.csv_imports for insert
  with check (user_id = auth.uid());

create policy "csv_imports_delete_own"
  on public.csv_imports for delete
  using (user_id = auth.uid());

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  journal_id uuid references public.journals(id) on delete cascade,
  import_id uuid references public.csv_imports(id) on delete set null,
  fingerprint text not null,
  serial text,
  symbol text not null,
  side text,
  opened_at timestamptz,
  closed_at timestamptz,
  qty numeric not null default 0,
  entry numeric,
  exit numeric,
  pnl numeric not null default 0,
  source_pnl numeric,
  currency text not null,
  source_currency text,
  aud_pnl numeric,
  fx_rate_to_aud numeric,
  setup text,
  notes text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, fingerprint)
);

create index if not exists trades_user_closed_idx on public.trades(user_id, closed_at);
create index if not exists trades_journal_id_idx on public.trades(journal_id);

alter table public.trades enable row level security;

create policy "trades_select_own"
  on public.trades for select
  using (user_id = auth.uid());

create policy "trades_insert_own"
  on public.trades for insert
  with check (user_id = auth.uid());

create policy "trades_update_own"
  on public.trades for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "trades_delete_own"
  on public.trades for delete
  using (user_id = auth.uid());

create table if not exists public.cash_flows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fingerprint text not null,
  occurred_at timestamptz,
  description text,
  type text not null check (type in ('deposit', 'withdrawal')),
  amount numeric not null default 0,
  currency text not null,
  created_at timestamptz not null default now(),
  unique (user_id, fingerprint)
);

create index if not exists cash_flows_user_occurred_idx on public.cash_flows(user_id, occurred_at);

alter table public.cash_flows enable row level security;

create policy "cash_flows_select_own"
  on public.cash_flows for select
  using (user_id = auth.uid());

create policy "cash_flows_insert_own"
  on public.cash_flows for insert
  with check (user_id = auth.uid());

create policy "cash_flows_update_own"
  on public.cash_flows for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "cash_flows_delete_own"
  on public.cash_flows for delete
  using (user_id = auth.uid());

create table if not exists public.statement_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fingerprint text not null,
  recorded_at timestamptz,
  currency text not null,
  balance numeric not null,
  row_order integer,
  created_at timestamptz not null default now(),
  unique (user_id, fingerprint)
);

create index if not exists statement_balances_user_recorded_idx
  on public.statement_balances(user_id, recorded_at);

alter table public.statement_balances enable row level security;

create policy "statement_balances_select_own"
  on public.statement_balances for select
  using (user_id = auth.uid());

create policy "statement_balances_insert_own"
  on public.statement_balances for insert
  with check (user_id = auth.uid());

create policy "statement_balances_update_own"
  on public.statement_balances for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "statement_balances_delete_own"
  on public.statement_balances for delete
  using (user_id = auth.uid());

-- Private CSV upload bucket. The bucket is not public.
insert into storage.buckets (id, name, public)
values ('csv-imports', 'csv-imports', false)
on conflict (id) do update set public = false;

create policy "csv_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'csv-imports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "csv_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'csv-imports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "csv_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'csv-imports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
