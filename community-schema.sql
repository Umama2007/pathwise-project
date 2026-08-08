-- 1. Create roadmap_comments table
CREATE TABLE IF NOT EXISTS roadmap_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    roadmap_id uuid REFERENCES roadmaps(id) ON DELETE CASCADE,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on roadmap_comments
ALTER TABLE roadmap_comments ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view comments on public roadmaps
CREATE POLICY "Allow public read of comments on public roadmaps"
ON roadmap_comments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM roadmaps
        WHERE roadmaps.id = roadmap_comments.roadmap_id
        AND (roadmaps.is_public = true OR roadmaps.user_id = auth.uid())
    )
);

-- Allow authenticated users to insert their own comments
CREATE POLICY "Allow authenticated users to insert own comments"
ON roadmap_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own comments
CREATE POLICY "Allow users to delete own comments"
ON roadmap_comments FOR DELETE
USING (auth.uid() = user_id);


-- 2. Create success_stories table
CREATE TABLE IF NOT EXISTS success_stories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    roadmap_id uuid REFERENCES roadmaps(id) ON DELETE SET NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on success_stories
ALTER TABLE success_stories ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read success stories
CREATE POLICY "Allow public read of success stories"
ON success_stories FOR SELECT
USING (true);

-- Allow authenticated users to insert their own success stories
CREATE POLICY "Allow authenticated users to insert own stories"
ON success_stories FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own success stories
CREATE POLICY "Allow users to delete own stories"
ON success_stories FOR DELETE
USING (auth.uid() = user_id);


-- 3. Create view for Leaderboard stats
CREATE OR REPLACE VIEW user_community_stats AS
SELECT 
    p.id AS user_id,
    p.name,
    p.avatar_url,
    p.current_streak,
    COALESCE(comp.completed_count, 0)::int AS roadmaps_completed,
    COALESCE(clon.clones_count, 0)::int AS clones_received
FROM profiles p
LEFT JOIN (
    SELECT r.user_id, count(r.id) AS completed_count
    FROM roadmaps r
    WHERE r.id IN (
        SELECT roadmap_id FROM roadmap_milestones
        GROUP BY roadmap_id
        HAVING count(*) = count(CASE WHEN status = 'completed' THEN 1 END) AND count(*) > 0
    )
    GROUP BY r.user_id
) comp ON comp.user_id = p.id
LEFT JOIN (
    SELECT user_id, sum(clone_count) AS clones_count
    FROM roadmaps
    GROUP BY user_id
) clon ON clon.user_id = p.id;
