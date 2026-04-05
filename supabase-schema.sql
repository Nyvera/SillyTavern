-- Supabase Schema for SillyTavern Migration

-- Enable JSONB and Vector extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Profiles (replaces single-user configs and secrets)
CREATE TABLE public.profiles (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  username text NOT NULL UNIQUE,
  settings jsonb DEFAULT '{}'::jsonb,
  secrets jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Seed Default User
INSERT INTO public.profiles (id, username, settings) 
VALUES ('00000000-0000-0000-0000-000000000000', 'default-user', '{}')
ON CONFLICT DO NOTHING;

-- 2. Characters
CREATE TABLE public.characters (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) DEFAULT '00000000-0000-0000-0000-000000000000',
  name text NOT NULL,
  avatar_url text, -- Points to Supabase Storage
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Chats (Metadata, canonical JSONL is in storage)
CREATE TABLE public.chats (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) DEFAULT '00000000-0000-0000-0000-000000000000',
  character_id uuid REFERENCES public.characters(id),
  chat_name text NOT NULL,
  storage_path text NOT NULL, -- Path to JSONL file in Supabase Storage
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Vector Embeddings (replaces vectra)
CREATE TABLE public.embeddings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) DEFAULT '00000000-0000-0000-0000-000000000000',
  chat_id uuid REFERENCES public.chats(id),
  content text NOT NULL,
  embedding vector(1536), -- Assumes OpenAI dense 1536. Adjust if using generic models.
  metadata jsonb DEFAULT '{}'::jsonb
);

-- 5. Storage Buckets configuration (Run this in the Supabase SQL editor as well)
-- Note: Requires superuser or doing it via the Supabase UI
INSERT INTO storage.buckets (id, name, public) VALUES ('sillytavern-assets', 'sillytavern-assets', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('sillytavern-chats', 'sillytavern-chats', false) ON CONFLICT DO NOTHING;

-- Storage policies for anon/authenticated (Single user fast-path: allow all for now, harden later)
CREATE POLICY "Allow public read access to assets" ON storage.objects FOR SELECT USING (bucket_id = 'sillytavern-assets');
CREATE POLICY "Allow anon insert to assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'sillytavern-assets');
CREATE POLICY "Allow anon update to assets" ON storage.objects FOR UPDATE USING (bucket_id = 'sillytavern-assets');
CREATE POLICY "Allow anon delete to assets" ON storage.objects FOR DELETE USING (bucket_id = 'sillytavern-assets');

CREATE POLICY "Allow anon all on chats" ON storage.objects FOR ALL USING (bucket_id = 'sillytavern-chats');

-- RLS settings (Disabled for fast MVP, enable later)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings DISABLE ROW LEVEL SECURITY;
