-- =====================================================
-- PATHWISE SECURITY AUDIT & RLS MIGRATIONS
-- =====================================================

-- 1. Enable RLS on all tables
ALTER TABLE IF EXISTS roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS roadmap_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS milestone_subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS milestone_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS milestone_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS roadmap_clones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS roadmap_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS success_stories ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow public read of roadmaps" ON roadmaps;
DROP POLICY IF EXISTS "Allow read of public or own roadmaps" ON roadmaps;
DROP POLICY IF EXISTS "Allow insert own roadmaps" ON roadmaps;
DROP POLICY IF EXISTS "Allow update own roadmaps" ON roadmaps;
DROP POLICY IF EXISTS "Allow delete own roadmaps" ON roadmaps;

DROP POLICY IF EXISTS "Allow read milestones of public or own roadmaps" ON roadmap_milestones;
DROP POLICY IF EXISTS "Allow insert milestones for own roadmaps" ON roadmap_milestones;
DROP POLICY IF EXISTS "Allow update milestones for own roadmaps" ON roadmap_milestones;
DROP POLICY IF EXISTS "Allow delete milestones for own roadmaps" ON roadmap_milestones;

DROP POLICY IF EXISTS "Allow read subtopics of accessible milestones" ON milestone_subtopics;
DROP POLICY IF EXISTS "Allow write subtopics of own milestones" ON milestone_subtopics;

DROP POLICY IF EXISTS "Allow read milestone_resources of accessible milestones" ON milestone_resources;
DROP POLICY IF EXISTS "Allow write milestone_resources of own milestones" ON milestone_resources;

DROP POLICY IF EXISTS "Allow read quizzes of accessible milestones" ON milestone_quizzes;
DROP POLICY IF EXISTS "Allow write quizzes of own milestones" ON milestone_quizzes;

DROP POLICY IF EXISTS "Allow read resources" ON resources;
DROP POLICY IF EXISTS "Allow authenticated users to write resources" ON resources;

DROP POLICY IF EXISTS "Allow public read of profiles" ON profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON profiles;

DROP POLICY IF EXISTS "Allow users all access to own chat messages" ON ai_chat_messages;

DROP POLICY IF EXISTS "Allow authenticated users to insert clone records" ON roadmap_clones;
DROP POLICY IF EXISTS "Allow users to view own clone records" ON roadmap_clones;
DROP POLICY IF EXISTS "Allow users all access to own clones" ON roadmap_clones;

DROP POLICY IF EXISTS "Allow public read of comments on public roadmaps" ON roadmap_comments;
DROP POLICY IF EXISTS "Allow authenticated users to insert own comments" ON roadmap_comments;
DROP POLICY IF EXISTS "Allow users to delete own comments" ON roadmap_comments;

DROP POLICY IF EXISTS "Allow public read of success stories" ON success_stories;
DROP POLICY IF EXISTS "Allow authenticated users to insert own stories" ON success_stories;
DROP POLICY IF EXISTS "Allow users to delete own stories" ON success_stories;


-- 3. Create fresh, robust security policies

-- --- PROFILES ---
CREATE POLICY "Allow public read of profiles" ON profiles
FOR SELECT USING (true);

CREATE POLICY "Allow users to update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- --- ROADMAPS ---
CREATE POLICY "Allow read of public or own roadmaps" ON roadmaps
FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Allow insert own roadmaps" ON roadmaps
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow update own roadmaps" ON roadmaps
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow delete own roadmaps" ON roadmaps
FOR DELETE USING (auth.uid() = user_id);

-- --- ROADMAP MILESTONES ---
CREATE POLICY "Allow read milestones of public or own roadmaps" ON roadmap_milestones
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM roadmaps
        WHERE roadmaps.id = roadmap_milestones.roadmap_id
        AND (roadmaps.is_public = true OR roadmaps.user_id = auth.uid())
    )
);

CREATE POLICY "Allow insert milestones for own roadmaps" ON roadmap_milestones
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM roadmaps
        WHERE roadmaps.id = roadmap_milestones.roadmap_id
        AND roadmaps.user_id = auth.uid()
    )
);

CREATE POLICY "Allow update milestones for own roadmaps" ON roadmap_milestones
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM roadmaps
        WHERE roadmaps.id = roadmap_milestones.roadmap_id
        AND roadmaps.user_id = auth.uid()
    )
);

CREATE POLICY "Allow delete milestones for own roadmaps" ON roadmap_milestones
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM roadmaps
        WHERE roadmaps.id = roadmap_milestones.roadmap_id
        AND roadmaps.user_id = auth.uid()
    )
);

-- --- MILESTONE SUBTOPICS ---
CREATE POLICY "Allow read subtopics of accessible milestones" ON milestone_subtopics
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM roadmap_milestones m
        JOIN roadmaps r ON r.id = m.roadmap_id
        WHERE m.id = milestone_subtopics.milestone_id
        AND (r.is_public = true OR r.user_id = auth.uid())
    )
);

CREATE POLICY "Allow write subtopics of own milestones" ON milestone_subtopics
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM roadmap_milestones m
        JOIN roadmaps r ON r.id = m.roadmap_id
        WHERE m.id = milestone_subtopics.milestone_id
        AND r.user_id = auth.uid()
    )
);

-- --- MILESTONE RESOURCES ---
CREATE POLICY "Allow read milestone_resources of accessible milestones" ON milestone_resources
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM roadmap_milestones m
        JOIN roadmaps r ON r.id = m.roadmap_id
        WHERE m.id = milestone_resources.milestone_id
        AND (r.is_public = true OR r.user_id = auth.uid())
    )
);

CREATE POLICY "Allow write milestone_resources of own milestones" ON milestone_resources
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM roadmap_milestones m
        JOIN roadmaps r ON r.id = m.roadmap_id
        WHERE m.id = milestone_resources.milestone_id
        AND r.user_id = auth.uid()
    )
);

-- --- MILESTONE QUIZZES ---
CREATE POLICY "Allow read quizzes of accessible milestones" ON milestone_quizzes
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM roadmap_milestones m
        JOIN roadmaps r ON r.id = m.roadmap_id
        WHERE m.id = milestone_quizzes.milestone_id
        AND (r.is_public = true OR r.user_id = auth.uid())
    )
);

CREATE POLICY "Allow write quizzes of own milestones" ON milestone_quizzes
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM roadmap_milestones m
        JOIN roadmaps r ON r.id = m.roadmap_id
        WHERE m.id = milestone_quizzes.milestone_id
        AND r.user_id = auth.uid()
    )
);

-- --- RESOURCES ---
CREATE POLICY "Allow read resources" ON resources
FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to write resources" ON resources
FOR ALL TO authenticated USING (true);

-- --- AI CHAT MESSAGES ---
CREATE POLICY "Allow users all access to own chat messages" ON ai_chat_messages
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- --- ROADMAP CLONES ---
CREATE POLICY "Allow users all access to own clones" ON roadmap_clones
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- --- ROADMAP COMMENTS ---
CREATE POLICY "Allow public read of comments on public roadmaps" ON roadmap_comments
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM roadmaps
        WHERE roadmaps.id = roadmap_comments.roadmap_id
        AND (roadmaps.is_public = true OR roadmaps.user_id = auth.uid())
    )
);

CREATE POLICY "Allow authenticated users to insert own comments" ON roadmap_comments
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete own comments" ON roadmap_comments
FOR DELETE USING (auth.uid() = user_id);

-- --- SUCCESS STORIES ---
CREATE POLICY "Allow public read of success stories" ON success_stories
FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert own stories" ON success_stories
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete own stories" ON success_stories
FOR DELETE USING (auth.uid() = user_id);


-- =====================================================
-- 4. VERIFICATION QUERIES
-- =====================================================

-- Query to check RLS status on all tables in public schema
SELECT 
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Query to list all active RLS policies in public schema
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
