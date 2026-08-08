-- 1. Extend the roadmaps table
ALTER TABLE roadmaps 
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'beginner',
ADD COLUMN IF NOT EXISTS clone_count int DEFAULT 0,
ADD COLUMN IF NOT EXISTS view_count int DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_curated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- 2. Create the roadmap_clones table
CREATE TABLE IF NOT EXISTS roadmap_clones (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    source_roadmap_id uuid REFERENCES roadmaps(id) ON DELETE CASCADE,
    cloned_roadmap_id uuid REFERENCES roadmaps(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT null
);

-- Enable RLS on roadmap_clones
ALTER TABLE roadmap_clones ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Allow anyone (including anonymous users) to view public roadmaps
CREATE POLICY "Allow public read of roadmaps" 
ON roadmaps FOR SELECT 
USING (is_public = true OR auth.uid() = user_id);

-- Allow authenticated users to insert clone records
CREATE POLICY "Allow authenticated users to insert clone records"
ON roadmap_clones FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own clone records
CREATE POLICY "Allow users to view own clone records"
ON roadmap_clones FOR SELECT
USING (auth.uid() = user_id);
