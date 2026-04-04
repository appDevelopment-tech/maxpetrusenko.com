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
  company text,
  role text,
  team_name text,
  status text not null default 'active',
  notes text,
  last_touch_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.maxpetrusenko_workspace_members enable row level security;
alter table public.maxpetrusenko_workspace_teams enable row level security;
alter table public.maxpetrusenko_workspace_people enable row level security;

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

insert into public.maxpetrusenko_workspace_members (email, role)
values ('max.petrusenko@gmail.com', 'owner')
on conflict (email) do update
set role = excluded.role;
