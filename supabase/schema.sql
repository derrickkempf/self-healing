-- Self-Healing — Supabase schema
--
-- Run this once in the Supabase SQL editor:
--   Project → SQL Editor → paste this whole file → Run.
--
-- Auth (sign-in via emailed 6-digit OTP) is handled by Supabase Auth, so
-- there is no auth_codes table anymore — Supabase manages issuing and
-- verifying codes for us. We do still keep a whitelist table so only
-- approved emails can write.

create extension if not exists "pgcrypto";

-- ============================================================================
-- whitelist
-- ============================================================================
-- Only these emails are allowed to sign in and write. Add rows here whenever
-- you want to admit a new collaborator.

create table if not exists public.whitelist (
  email      text primary key,
  added_at   timestamptz not null default now()
);

-- Seed the project owner. Replace with your own email if you fork this.
insert into public.whitelist (email) values ('dk@derrickkempf.com')
  on conflict (email) do nothing;

-- Convenience predicate used in policies below.
create or replace function public.is_whitelisted() returns boolean
  language sql stable
as $$
  select exists (
    select 1 from public.whitelist
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ============================================================================
-- posts
-- ============================================================================

create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  content      text not null,
  image_url    text,
  created_at   timestamptz not null default now(),
  author_email text not null
);
create index if not exists posts_created_at_idx
  on public.posts (created_at desc);

-- ============================================================================
-- messages
-- ============================================================================

create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_email text not null,
  content      text not null,
  created_at   timestamptz not null default now()
);
create index if not exists messages_created_at_idx
  on public.messages (created_at);

-- ============================================================================
-- profiles
-- ============================================================================

create table if not exists public.profiles (
  email         text primary key,
  display_name  text not null default '',
  tagline       text not null default '',
  avatar_url    text,
  cover_url     text,
  links         text[] not null default '{}'::text[],
  updated_at    timestamptz not null default now()
);

-- ============================================================================
-- gallery_images
-- ============================================================================

create table if not exists public.gallery_images (
  id         uuid primary key default gen_random_uuid(),
  url        text not null,
  caption    text not null default '',
  position   integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists gallery_position_idx
  on public.gallery_images (position);

-- ============================================================================
-- notification_prefs
-- ============================================================================

create table if not exists public.notification_prefs (
  email         text primary key,
  new_posts     boolean not null default true,
  new_messages  boolean not null default true,
  ignore_own    boolean not null default true,
  email_digest  text not null default 'off'
                check (email_digest in ('off', 'daily', 'weekly'))
);

-- ============================================================================
-- Realtime — broadcast inserts/updates over the websocket
-- ============================================================================

alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.gallery_images;
alter publication supabase_realtime add table public.profiles;

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- Public read on posts + gallery (the landing page shows both).
-- Profiles are readable by anyone signed in (used to show display names
-- and avatars in the chat). Messages and notification_prefs are private
-- to authenticated, whitelisted users.

alter table public.posts              enable row level security;
alter table public.messages           enable row level security;
alter table public.profiles           enable row level security;
alter table public.gallery_images     enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.whitelist          enable row level security;

-- posts
drop policy if exists "posts: public read"     on public.posts;
drop policy if exists "posts: insert allowed"  on public.posts;
create policy "posts: public read" on public.posts
  for select using (true);
create policy "posts: insert allowed" on public.posts
  for insert with check (public.is_whitelisted());

-- messages
drop policy if exists "messages: read allowed"   on public.messages;
drop policy if exists "messages: insert allowed" on public.messages;
create policy "messages: read allowed" on public.messages
  for select using (public.is_whitelisted());
create policy "messages: insert allowed" on public.messages
  for insert with check (public.is_whitelisted());

-- profiles
drop policy if exists "profiles: public read"   on public.profiles;
drop policy if exists "profiles: upsert self"   on public.profiles;
drop policy if exists "profiles: update self"   on public.profiles;
create policy "profiles: public read" on public.profiles
  for select using (true);
create policy "profiles: upsert self" on public.profiles
  for insert with check (
    public.is_whitelisted()
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
create policy "profiles: update self" on public.profiles
  for update using (
    public.is_whitelisted()
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- gallery_images
drop policy if exists "gallery: public read"    on public.gallery_images;
drop policy if exists "gallery: insert allowed" on public.gallery_images;
drop policy if exists "gallery: update allowed" on public.gallery_images;
drop policy if exists "gallery: delete allowed" on public.gallery_images;
create policy "gallery: public read" on public.gallery_images
  for select using (true);
create policy "gallery: insert allowed" on public.gallery_images
  for insert with check (public.is_whitelisted());
create policy "gallery: update allowed" on public.gallery_images
  for update using (public.is_whitelisted());
create policy "gallery: delete allowed" on public.gallery_images
  for delete using (public.is_whitelisted());

-- notification_prefs
drop policy if exists "prefs: read self"   on public.notification_prefs;
drop policy if exists "prefs: upsert self" on public.notification_prefs;
drop policy if exists "prefs: update self" on public.notification_prefs;
create policy "prefs: read self" on public.notification_prefs
  for select using (
    public.is_whitelisted()
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
create policy "prefs: upsert self" on public.notification_prefs
  for insert with check (
    public.is_whitelisted()
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
create policy "prefs: update self" on public.notification_prefs
  for update using (
    public.is_whitelisted()
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- whitelist — readable by the predicate function above, never client-writable.
drop policy if exists "whitelist: no client access" on public.whitelist;
-- (No policies = no client access. Manage rows via the SQL editor.)
