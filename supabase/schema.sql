-- Self-Healing — Supabase schema
-- Run this in the Supabase SQL editor when you're ready to swap off the
-- mocked backend.

create extension if not exists "pgcrypto";

-- users
create table if not exists public.users (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  whitelisted boolean not null default false,
  last_login  timestamptz
);

-- auth_codes
create table if not exists public.auth_codes (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  code       text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used       boolean not null default false
);
create index if not exists auth_codes_email_idx on public.auth_codes (email);
create index if not exists auth_codes_expires_idx on public.auth_codes (expires_at);

-- posts
create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  content      text not null,
  image_url    text,
  created_at   timestamptz not null default now(),
  author_email text not null
);
create index if not exists posts_created_at_idx on public.posts (created_at desc);

-- messages
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_email text not null,
  content      text not null,
  created_at   timestamptz not null default now()
);
create index if not exists messages_created_at_idx on public.messages (created_at);

-- Enable realtime for the chat feed.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.posts;

-- RLS policies (tighten before going to production).
alter table public.users enable row level security;
alter table public.auth_codes enable row level security;
alter table public.posts enable row level security;
alter table public.messages enable row level security;

-- Public read for posts (the landing page shows the latest few).
create policy "posts: public read" on public.posts
  for select using (true);

-- Authenticated users can insert posts and messages.
create policy "posts: insert authed" on public.posts
  for insert with check (auth.role() = 'authenticated');

create policy "messages: read authed" on public.messages
  for select using (auth.role() = 'authenticated');

create policy "messages: insert authed" on public.messages
  for insert with check (auth.role() = 'authenticated');
