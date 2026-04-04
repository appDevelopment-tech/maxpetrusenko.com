alter table public.maxpetrusenko_workspace_people
  add column if not exists phone text,
  add column if not exists whatsapp_number text,
  add column if not exists website text,
  add column if not exists timezone text,
  add column if not exists preferred_contact_method text,
  add column if not exists source text not null default 'manual',
  add column if not exists source_ref text,
  add column if not exists lane text,
  add column if not exists intent text,
  add column if not exists score integer not null default 0,
  add column if not exists owner text,
  add column if not exists follow_up_at timestamptz,
  add column if not exists last_contact_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists maxpetrusenko_workspace_people_source_ref_key
  on public.maxpetrusenko_workspace_people (source, source_ref)
  where source_ref is not null;

create unique index if not exists maxpetrusenko_workspace_people_email_key
  on public.maxpetrusenko_workspace_people (lower(email))
  where email is not null;

create table if not exists public.maxpetrusenko_workspace_touchpoints (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.maxpetrusenko_workspace_people(id) on delete set null,
  source text not null,
  source_ref text not null,
  channel text not null,
  direction text not null default 'inbound',
  summary text not null,
  content_preview text,
  lane text,
  intent text,
  stage text,
  score integer not null default 0,
  owner text,
  pathname text,
  title text,
  follow_up_at timestamptz,
  last_contact_at timestamptz,
  touched_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists maxpetrusenko_workspace_touchpoints_source_key
  on public.maxpetrusenko_workspace_touchpoints (source, source_ref);

create index if not exists maxpetrusenko_workspace_touchpoints_touched_at_idx
  on public.maxpetrusenko_workspace_touchpoints (touched_at desc);

alter table public.maxpetrusenko_workspace_touchpoints enable row level security;

drop policy if exists "Workspace members can read touchpoints" on public.maxpetrusenko_workspace_touchpoints;
create policy "Workspace members can read touchpoints"
on public.maxpetrusenko_workspace_touchpoints
for select
to authenticated
using (public.maxpetrusenko_is_workspace_member());

drop policy if exists "Workspace members can insert people" on public.maxpetrusenko_workspace_people;
create policy "Workspace members can insert people"
on public.maxpetrusenko_workspace_people
for insert
to authenticated
with check (public.maxpetrusenko_is_workspace_member());

drop policy if exists "Workspace members can update people" on public.maxpetrusenko_workspace_people;
create policy "Workspace members can update people"
on public.maxpetrusenko_workspace_people
for update
to authenticated
using (public.maxpetrusenko_is_workspace_member())
with check (public.maxpetrusenko_is_workspace_member());

drop policy if exists "Workspace members can insert touchpoints" on public.maxpetrusenko_workspace_touchpoints;
create policy "Workspace members can insert touchpoints"
on public.maxpetrusenko_workspace_touchpoints
for insert
to authenticated
with check (public.maxpetrusenko_is_workspace_member());

drop policy if exists "Workspace members can update touchpoints" on public.maxpetrusenko_workspace_touchpoints;
create policy "Workspace members can update touchpoints"
on public.maxpetrusenko_workspace_touchpoints
for update
to authenticated
using (public.maxpetrusenko_is_workspace_member())
with check (public.maxpetrusenko_is_workspace_member());
