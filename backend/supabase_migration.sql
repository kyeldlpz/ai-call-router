-- RecoverAi Supabase Schema
-- Run this in the Supabase SQL Editor (https://yxwjhabsybpngvpyrvip.supabase.co → SQL Editor)

-- 1. Profiles table (extends Supabase Auth users with roles)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('super_admin', 'admin', 'agent')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Calls table (stores every completed call)
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'complete' CHECK (status IN ('idle', 'active', 'complete')),
  category TEXT CHECK (category IN ('payment', 'dispute', 'hardship', 'settlement', 'callback', 'general', 'unknown')),
  summary TEXT,
  language TEXT DEFAULT 'en',
  duration_seconds INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Transcript messages table
CREATE TABLE IF NOT EXISTS transcript_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL CHECK (speaker IN ('ai', 'caller')),
  text TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  sequence INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for profiles
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Service can manage profiles" ON profiles
  FOR ALL USING (true) WITH CHECK (true);

-- 6. RLS Policies for calls — only super_admin can read
CREATE POLICY "super_admin_read_calls" ON calls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Service role can insert/update calls (bypasses RLS anyway, but explicit)
CREATE POLICY "service_insert_calls" ON calls
  FOR INSERT WITH CHECK (true);

CREATE POLICY "service_update_calls" ON calls
  FOR UPDATE USING (true) WITH CHECK (true);

-- 7. RLS Policies for transcript_messages — only super_admin can read
CREATE POLICY "super_admin_read_transcripts" ON transcript_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "service_insert_transcripts" ON transcript_messages
  FOR INSERT WITH CHECK (true);

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calls_category ON calls(category);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_call_id ON calls(call_id);
CREATE INDEX IF NOT EXISTS idx_transcript_messages_call_id ON transcript_messages(call_id);

-- 9. Auto-create profile on user signup (trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'agent');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. Create a default super_admin user (update email to yours)
-- Run this AFTER you sign up through the app:
-- UPDATE profiles SET role = 'super_admin' WHERE email = 'your-email@example.com';
