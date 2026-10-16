create extension if not exists pgcrypto;

create table public.owners (
  id uuid primary key default gen_random_uuid(),
  account_id uuid unique,
  kind text not null default 'anonymous',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.anonymous_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallets (
  owner_id uuid primary key references public.owners(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  kind text not null,
  amount integer not null check (amount <> 0),
  operation_key text not null unique,
  refund_for_ledger_id uuid unique references public.credit_ledger(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.garment_batches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  source_count integer not null check (source_count between 2 and 5),
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.garments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  batch_id uuid not null references public.garment_batches(id) on delete cascade,
  source_hash text not null,
  category text not null default 'other',
  primary_color text,
  length text,
  quality_status text not null default 'pending',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, source_hash)
);

create table public.garment_assets (
  id uuid primary key default gen_random_uuid(),
  garment_id uuid not null references public.garments(id) on delete cascade,
  version integer not null default 1,
  object_key text not null,
  width integer not null,
  height integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (garment_id, version)
);

create table public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  batch_id uuid references public.garment_batches(id) on delete set null,
  kind text not null,
  state text not null default 'queued',
  idempotency_key text not null unique,
  source_keys jsonb not null default '[]'::jsonb,
  attempts integer not null default 0,
  lease_until timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  aggregate_id uuid not null,
  payload jsonb not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.looks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  render_key text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.look_items (
  id uuid primary key default gen_random_uuid(),
  look_id uuid not null references public.looks(id) on delete cascade,
  garment_id uuid not null references public.garments(id) on delete restrict,
  asset_version integer not null,
  transform jsonb not null,
  layer integer not null,
  locked boolean not null default false,
  category_snapshot text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.advice_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  look_id uuid references public.looks(id) on delete set null,
  ledger_id uuid references public.credit_ledger(id) on delete set null,
  candidate_ids jsonb not null,
  snapshot jsonb not null,
  state text not null default 'queued',
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  provider text not null,
  provider_order_id text not null,
  state text not null default 'created',
  credits integer not null,
  amount_fen integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_order_id)
);

create index anonymous_sessions_owner_id_idx on public.anonymous_sessions(owner_id);
create index credit_ledger_owner_id_created_at_idx on public.credit_ledger(owner_id, created_at desc);
create index garments_owner_id_created_at_idx on public.garments(owner_id, created_at desc);
create index processing_jobs_state_lease_idx on public.processing_jobs(state, lease_until);
create index looks_owner_id_created_at_idx on public.looks(owner_id, created_at desc);
create index advice_requests_owner_id_created_at_idx on public.advice_requests(owner_id, created_at desc);

alter table public.owners enable row level security;
alter table public.anonymous_sessions enable row level security;
alter table public.wallets enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.garment_batches enable row level security;
alter table public.garments enable row level security;
alter table public.garment_assets enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.outbox_events enable row level security;
alter table public.looks enable row level security;
alter table public.look_items enable row level security;
alter table public.advice_requests enable row level security;
alter table public.payment_orders enable row level security;

create policy owners_account_access on public.owners
  for all using (account_id = auth.uid()) with check (account_id = auth.uid());

create policy anonymous_sessions_account_access on public.anonymous_sessions
  for all using (owner_id in (select id from public.owners where account_id = auth.uid()))
  with check (owner_id in (select id from public.owners where account_id = auth.uid()));

create policy wallets_account_access on public.wallets
  for all using (owner_id in (select id from public.owners where account_id = auth.uid()))
  with check (owner_id in (select id from public.owners where account_id = auth.uid()));

create policy credit_ledger_account_access on public.credit_ledger
  for all using (owner_id in (select id from public.owners where account_id = auth.uid()))
  with check (owner_id in (select id from public.owners where account_id = auth.uid()));

create policy garment_batches_account_access on public.garment_batches
  for all using (owner_id in (select id from public.owners where account_id = auth.uid()))
  with check (owner_id in (select id from public.owners where account_id = auth.uid()));

create policy garments_account_access on public.garments
  for all using (owner_id in (select id from public.owners where account_id = auth.uid()))
  with check (owner_id in (select id from public.owners where account_id = auth.uid()));

create policy garment_assets_account_access on public.garment_assets
  for all using (garment_id in (select id from public.garments where owner_id in (select id from public.owners where account_id = auth.uid())))
  with check (garment_id in (select id from public.garments where owner_id in (select id from public.owners where account_id = auth.uid())));

create policy processing_jobs_account_access on public.processing_jobs
  for all using (owner_id in (select id from public.owners where account_id = auth.uid()))
  with check (owner_id in (select id from public.owners where account_id = auth.uid()));

create policy looks_account_access on public.looks
  for all using (owner_id in (select id from public.owners where account_id = auth.uid()))
  with check (owner_id in (select id from public.owners where account_id = auth.uid()));

create policy look_items_account_access on public.look_items
  for all using (look_id in (select id from public.looks where owner_id in (select id from public.owners where account_id = auth.uid())))
  with check (look_id in (select id from public.looks where owner_id in (select id from public.owners where account_id = auth.uid())));

create policy advice_requests_account_access on public.advice_requests
  for all using (owner_id in (select id from public.owners where account_id = auth.uid()))
  with check (owner_id in (select id from public.owners where account_id = auth.uid()));

create policy payment_orders_account_access on public.payment_orders
  for all using (owner_id in (select id from public.owners where account_id = auth.uid()))
  with check (owner_id in (select id from public.owners where account_id = auth.uid()));
