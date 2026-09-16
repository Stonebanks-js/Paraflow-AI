-- Paraflow AI: History, Projects, and Para Agent Assistant
-- Run this in the Supabase SQL Editor against the live project (same way
-- the earlier handle_new_user() credit-trigger fix was applied). Safe to
-- re-run: every statement is idempotent (IF NOT EXISTS / OR REPLACE).
--
-- What this adds:
-- 1. public.projects -- user-created containers to group history/chats,
--    like Claude/ChatGPT "Projects".
-- 2. Two new columns on the EXISTING public.tool_jobs table (title,
--    project_id) -- that table already existed in the original schema
--    with exactly the right shape for engine-usage history (user_id,
--    tool_name, input_data, output_data, status, credits_used,
--    created_at) but was never actually written to by any backend code.
--    This migration doesn't change its existing columns, only extends it.
-- 3. public.assistant_sessions / public.assistant_messages -- the Para
--    Agent chatbot's own conversation history, separate from tool_jobs
--    since a chat session is a different shape (ordered messages, not a
--    single input/output pair).

-- 1. Projects
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
CREATE POLICY "Users can view own projects"
    ON public.projects FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
CREATE POLICY "Users can insert own projects"
    ON public.projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
CREATE POLICY "Users can update own projects"
    ON public.projects FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
CREATE POLICY "Users can delete own projects"
    ON public.projects FOR DELETE
    USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS projects_updated_at ON public.projects;
CREATE TRIGGER projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. Extend the existing tool_jobs table (History)
ALTER TABLE public.tool_jobs ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.tool_jobs ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Users can delete own tool jobs" ON public.tool_jobs;
CREATE POLICY "Users can delete own tool jobs"
    ON public.tool_jobs FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tool_jobs_project_id ON public.tool_jobs(project_id);

-- 3. Para Agent assistant sessions + messages
CREATE TABLE IF NOT EXISTS public.assistant_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assistant_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES public.assistant_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    attachment_name TEXT,
    suggested_engine TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.assistant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own assistant sessions" ON public.assistant_sessions;
CREATE POLICY "Users can view own assistant sessions"
    ON public.assistant_sessions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own assistant sessions" ON public.assistant_sessions;
CREATE POLICY "Users can insert own assistant sessions"
    ON public.assistant_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own assistant sessions" ON public.assistant_sessions;
CREATE POLICY "Users can update own assistant sessions"
    ON public.assistant_sessions FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own assistant sessions" ON public.assistant_sessions;
CREATE POLICY "Users can delete own assistant sessions"
    ON public.assistant_sessions FOR DELETE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own assistant messages" ON public.assistant_messages;
CREATE POLICY "Users can view own assistant messages"
    ON public.assistant_messages FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own assistant messages" ON public.assistant_messages;
CREATE POLICY "Users can insert own assistant messages"
    ON public.assistant_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS assistant_sessions_updated_at ON public.assistant_sessions;
CREATE TRIGGER assistant_sessions_updated_at
    BEFORE UPDATE ON public.assistant_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_sessions_user_id ON public.assistant_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_sessions_project_id ON public.assistant_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_assistant_messages_session_id ON public.assistant_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_assistant_messages_created_at ON public.assistant_messages(created_at);
