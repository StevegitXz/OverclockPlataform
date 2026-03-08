-- Overclock / Supabase schema
-- Rode tudo de uma vez no SQL Editor do Supabase.

begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.app_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  daily_goal_minutes integer not null default 240 check (daily_goal_minutes between 0 and 1440),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id)
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null,
  duration_seconds integer not null check (duration_seconds > 0 and duration_seconds <= 86400),
  notes text not null default '' check (char_length(notes) <= 500),
  created_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  ended_at timestamptz,
  constraint study_sessions_subject_fk
    foreign key (subject_id, user_id)
    references public.subjects(id, user_id)
    on delete cascade
);

create unique index if not exists subjects_user_lower_name_idx
  on public.subjects (user_id, lower(name));

create index if not exists subjects_user_id_idx
  on public.subjects (user_id);

create index if not exists sessions_user_id_idx
  on public.study_sessions (user_id);

create index if not exists sessions_subject_id_idx
  on public.study_sessions (subject_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists set_app_settings_updated_at on public.app_settings;
create trigger set_app_settings_updated_at
before update on public.app_settings
for each row execute procedure public.set_updated_at();

drop trigger if exists set_subjects_updated_at on public.subjects;
create trigger set_subjects_updated_at
before update on public.subjects
for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, lower(new.email))
  on conflict (id) do update
    set email = excluded.email,
        updated_at = timezone('utc', now());

  insert into public.app_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.profiles (id, email)
select id, lower(email)
from auth.users
on conflict (id) do update
  set email = excluded.email,
      updated_at = timezone('utc', now());

insert into public.app_settings (user_id)
select id
from auth.users
on conflict (user_id) do nothing;

alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.subjects enable row level security;
alter table public.study_sessions enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "settings_select_own" on public.app_settings;
create policy "settings_select_own"
on public.app_settings
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "settings_insert_own" on public.app_settings;
create policy "settings_insert_own"
on public.app_settings
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "settings_update_own" on public.app_settings;
create policy "settings_update_own"
on public.app_settings
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "subjects_select_own" on public.subjects;
create policy "subjects_select_own"
on public.subjects
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "subjects_insert_own" on public.subjects;
create policy "subjects_insert_own"
on public.subjects
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "subjects_update_own" on public.subjects;
create policy "subjects_update_own"
on public.subjects
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "subjects_delete_own" on public.subjects;
create policy "subjects_delete_own"
on public.subjects
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "sessions_select_own" on public.study_sessions;
create policy "sessions_select_own"
on public.study_sessions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "sessions_insert_own" on public.study_sessions;
create policy "sessions_insert_own"
on public.study_sessions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "sessions_update_own" on public.study_sessions;
create policy "sessions_update_own"
on public.study_sessions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "sessions_delete_own" on public.study_sessions;
create policy "sessions_delete_own"
on public.study_sessions
for delete
to authenticated
using ((select auth.uid()) = user_id);

commit;
