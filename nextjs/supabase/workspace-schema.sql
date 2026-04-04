create extension if not exists pgcrypto;

create table if not exists public.maxpetrusenko_workspace_members (
  email text primary key,
  role text not null default 'viewer',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.maxpetrusenko_workspace_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  focus text,
  status text not null default 'active',
  member_count integer not null default 0,
  last_touch_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.maxpetrusenko_workspace_people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  whatsapp_number text,
  company text,
  role text,
  team_name text,
  website text,
  timezone text,
  preferred_contact_method text,
  source text not null default 'manual',
  source_ref text,
  lane text,
  intent text,
  score integer not null default 0,
  owner text,
  follow_up_at timestamptz,
  last_contact_at timestamptz,
  status text not null default 'active',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  last_touch_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

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

alter table public.maxpetrusenko_workspace_members enable row level security;
alter table public.maxpetrusenko_workspace_teams enable row level security;
alter table public.maxpetrusenko_workspace_people enable row level security;
alter table public.maxpetrusenko_workspace_touchpoints enable row level security;

create or replace function public.maxpetrusenko_is_workspace_member()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.maxpetrusenko_workspace_members
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

grant execute on function public.maxpetrusenko_is_workspace_member() to authenticated;

drop policy if exists "Workspace members can read members" on public.maxpetrusenko_workspace_members;
create policy "Workspace members can read members"
on public.maxpetrusenko_workspace_members
for select
to authenticated
using (public.maxpetrusenko_is_workspace_member());

drop policy if exists "Workspace members can read teams" on public.maxpetrusenko_workspace_teams;
create policy "Workspace members can read teams"
on public.maxpetrusenko_workspace_teams
for select
to authenticated
using (public.maxpetrusenko_is_workspace_member());

drop policy if exists "Workspace members can read people" on public.maxpetrusenko_workspace_people;
create policy "Workspace members can read people"
on public.maxpetrusenko_workspace_people
for select
to authenticated
using (public.maxpetrusenko_is_workspace_member());

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

insert into public.maxpetrusenko_workspace_members (email, role)
values ('max.petrusenko@gmail.com', 'owner')
on conflict (email) do update
set role = excluded.role;
