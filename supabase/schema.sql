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

-- ============================================================================
-- admins  (site-content editors — a strict subset of whitelist)
-- ============================================================================
-- Whitelisted collaborators can sign in and post/message. Admins can
-- ADDITIONALLY edit site copy through the built-in CMS. Add rows here
-- when you want to give another person write-access to site_content.

create table if not exists public.admins (
  email    text primary key,
  added_at timestamptz not null default now()
);

-- Seed the project owner as the only admin. Add more via:
--   insert into public.admins (email) values ('collab@example.com');
insert into public.admins (email) values ('dk@derrickkempf.com')
  on conflict (email) do nothing;

-- Predicate used by the site_content RLS policies. Mirrors the
-- is_whitelisted() pattern — SECURITY DEFINER so it can read the
-- admins table even though RLS is enabled on it.
create or replace function public.is_admin() returns boolean
  language sql stable
  security definer
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Diagnostic RPC — the client calls this when any write returns an RLS
-- error, so we can see the exact JWT + whitelist state that produced the
-- rejection. Runs as the caller (INVOKER, not DEFINER) so auth.jwt() and
-- auth.role() reflect the actual request context. Safe to leave in prod;
-- it only reveals what the caller already knows about themselves plus a
-- boolean result of is_whitelisted().
create or replace function public.debug_auth() returns jsonb
  language sql stable
as $$
  select jsonb_build_object(
    'auth_role', auth.role(),
    'jwt_email', auth.jwt() ->> 'email',
    'jwt_sub', auth.jwt() ->> 'sub',
    'is_whitelisted', public.is_whitelisted(),
    'is_admin', public.is_admin(),
    'has_jwt_claims',
      current_setting('request.jwt.claims', true) is not null
        and current_setting('request.jwt.claims', true) <> ''
  );
$$;

-- Convenience predicate used in policies below.
--
-- IMPORTANT: SECURITY DEFINER so the function runs with owner privileges
-- (postgres, which has BYPASSRLS in Supabase) and can therefore read the
-- whitelist table even though whitelist has RLS on with no client-select
-- policy.
--
-- NOTE: Do NOT add `set search_path = ...` here. It causes auth.jwt() to
-- return null inside the function on some Supabase / Postgres configs,
-- silently breaking every RLS write policy that uses this predicate.
-- We already reference the table with a fully-qualified name
-- (public.whitelist) so schema shadowing isn't a risk in practice.
create or replace function public.is_whitelisted() returns boolean
  language sql stable
  security definer
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
-- site_content (headless CMS store)
-- ============================================================================
-- Editable copy for the public site. Every editable block on the site
-- has a well-known `key` (e.g., 'story.section.how_it_started'). Public
-- pages read via `select`; whitelisted collaborators write via the in-
-- app Content admin card. If a key isn't in the table yet, the page
-- falls back to a hardcoded default so the site is never empty.

create table if not exists public.site_content (
  key         text primary key,
  title       text,
  body_html   text not null default '',
  order_index integer not null default 0,
  updated_at  timestamptz not null default now()
);

-- ============================================================================
-- signups (public notify list)
-- ============================================================================
-- Public opt-in list for drop notifications. Anyone can add themselves;
-- nobody except the schema owner can read the list. Read from the SQL
-- editor when it's time to send a drop announcement.

create table if not exists public.signups (
  email      text primary key,
  created_at timestamptz not null default now(),
  source     text
);

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
alter table public.signups            enable row level security;
alter table public.site_content       enable row level security;
alter table public.admins             enable row level security;
-- admins — no client policies. Only readable via the is_admin() SECURITY
-- DEFINER function (which has BYPASSRLS). Manage rows in the SQL editor.

-- signups — anonymous INSERT only. Nobody can SELECT / UPDATE / DELETE
-- from the client (the founder reads via the SQL editor).
drop policy if exists "signups: public insert" on public.signups;
create policy "signups: public insert" on public.signups
  for insert to anon, authenticated with check (true);

-- site_content — public read, ADMIN-ONLY write. Everyone can render
-- edited copy on the public site; only rows in public.admins can
-- change it via the Content admin card in the dashboard.
drop policy if exists "site_content: public read"        on public.site_content;
drop policy if exists "site_content: whitelisted insert" on public.site_content;
drop policy if exists "site_content: whitelisted update" on public.site_content;
drop policy if exists "site_content: admin insert"       on public.site_content;
drop policy if exists "site_content: admin update"       on public.site_content;
create policy "site_content: public read" on public.site_content
  for select using (true);
create policy "site_content: admin insert" on public.site_content
  for insert with check (public.is_admin());
create policy "site_content: admin update" on public.site_content
  for update using (public.is_admin());

-- Realtime — so a save from the admin card shows up on the public
-- Story / About / Notify pages immediately for anyone with them open.
alter publication supabase_realtime add table public.site_content;

-- posts
drop policy if exists "posts: public read"     on public.posts;
drop policy if exists "posts: insert allowed"  on public.posts;
drop policy if exists "posts: delete own"      on public.posts;
create policy "posts: public read" on public.posts
  for select using (true);
create policy "posts: insert allowed" on public.posts
  for insert with check (public.is_whitelisted());
-- Only the post's author can delete it. Whitelisted-only guarantee
-- means public visitors (who can read) can't delete anything.
create policy "posts: delete own" on public.posts
  for delete using (
    public.is_whitelisted()
    and lower(author_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- messages
drop policy if exists "messages: read allowed"   on public.messages;
drop policy if exists "messages: insert allowed" on public.messages;
drop policy if exists "messages: delete own"     on public.messages;
create policy "messages: read allowed" on public.messages
  for select using (public.is_whitelisted());
create policy "messages: insert allowed" on public.messages
  for insert with check (public.is_whitelisted());
-- Only the message sender can delete it. Same "whitelisted + own row"
-- rule as posts.
create policy "messages: delete own" on public.messages
  for delete using (
    public.is_whitelisted()
    and lower(sender_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

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
