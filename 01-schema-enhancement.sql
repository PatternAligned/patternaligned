-- PatternAligned Phase 1 Schema Enhancement
-- This schema does 3 things:
-- 1. NextAuth tables (users, accounts, sessions, verification_tokens)
-- 2. PatternAligned tables (messages, behavioral events, fingerprints)
-- 3. Security + Performance (RLS policies, triggers, indexes)

-- ============================================================================
-- PART 1: NEXTAUTH TABLES (Required for authentication)
-- ============================================================================

-- Users table: Every person who signs up
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  email_verified TIMESTAMP WITH TIME ZONE,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Accounts table: OAuth providers (GitHub, Google, etc.)
-- For now just passwordless email, but ready for OAuth later
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(provider, provider_account_id)
);

-- Sessions table: Active user sessions (managed by NextAuth)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Verification tokens: Email magic links
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(identifier, token)
);

-- ============================================================================
-- PART 2: PATTERNALIG­NED CORE TABLES
-- ============================================================================

-- Messages: Every conversation message (this is your raw behavioral data)
-- WHY: You need to store messages with METADATA, not just text
-- The metadata (pause_time, edit_count, word_count) feeds fingerprinting later
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  
  -- Behavioral metadata captured at message creation
  word_count INT,
  token_count INT,
  pause_time_ms INT, -- How long user paused before sending (ms)
  edit_count INT DEFAULT 0, -- How many times user edited before sending
  sentiment_score FLOAT, -- -1 to 1, computed later
  
  -- System metadata
  model_used TEXT DEFAULT 'claude-sonnet',
  temperature FLOAT DEFAULT 0.7,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Behavioral events: Granular interaction tracking
-- WHY: Messages alone aren't enough. You need to capture EVERY interaction
-- This table captures typing, pausing, editing, scrolling - everything
CREATE TABLE IF NOT EXISTS behavioral_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL CHECK (event_type IN (
    'message_start',      -- User started typing
    'message_pause',      -- User paused mid-message
    'message_edit',       -- User edited message
    'message_submit',     -- User sent message
    'sidebar_open',       -- User opened sidebar
    'sidebar_close',      -- User closed sidebar
    'model_switch',       -- User changed model
    'temperature_change', -- User adjusted temperature
    'page_focus',         -- User returned to window
    'page_blur'           -- User left window
  )),
  
  metadata JSONB, -- Flexible storage for event-specific data
  -- Example: {"pause_duration_ms": 2000, "character_count": 150}
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User behavioral fingerprints: Aggregated personality patterns
-- WHY: This is Phase 2, but we're setting the table now so messages flow into it
-- The fingerprint captures HOW a user behaves (word choice, response time, personality)
CREATE TABLE IF NOT EXISTS user_behavioral_fingerprints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Aggregated behavioral signals
  fingerprint JSONB DEFAULT '{}'::jsonb, -- Stores computed patterns
  -- Example: {"avg_pause_time": 2000, "avg_edit_count": 1.2, "sentiment_shift": 0.3}
  
  message_count INT DEFAULT 0, -- How many messages to compute from
  confidence_score FLOAT DEFAULT 0, -- 0-1, how confident is this fingerprint
  
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- PART 3: ANALYTICS TABLES (Real-time dashboards)
-- ============================================================================

-- User activity aggregates: Fast queries for dashboard
-- WHY: Don't query raw messages every time. Aggregate once, query fast
CREATE TABLE IF NOT EXISTS user_activity_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  total_messages INT DEFAULT 0,
  messages_today INT DEFAULT 0,
  messages_this_week INT DEFAULT 0,
  
  avg_pause_time_ms INT,
  avg_edit_count FLOAT,
  avg_word_count INT,
  
  last_message_at TIMESTAMP WITH TIME ZONE,
  
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id)
);

-- ============================================================================
-- PART 4: SECURITY (Row Level Security / RLS)
-- ============================================================================

-- RLS = Database-level access control
-- WHY: A user can NEVER see another user's data, even if they hack the JWT
-- This is non-negotiable for a product handling behavioral data

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavioral_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_stats ENABLE ROW LEVEL SECURITY;

-- Users can only see their own user record
CREATE POLICY "Users see only their own user data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can only see their own messages
CREATE POLICY "Users see only their own messages"
  ON messages FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own messages
CREATE POLICY "Users can only create their own messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only see their own behavioral events
CREATE POLICY "Users see only their own behavioral events"
  ON behavioral_events FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own behavioral events
CREATE POLICY "Users can only create their own behavioral events"
  ON behavioral_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only see their own fingerprint
CREATE POLICY "Users see only their own fingerprint"
  ON user_behavioral_fingerprints FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only see their own activity stats
CREATE POLICY "Users see only their own activity stats"
  ON user_activity_stats FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- PART 5: AUTOMATIC UPDATES (Triggers)
-- ============================================================================

-- Trigger: Update user.updated_at whenever they're modified
CREATE OR REPLACE FUNCTION update_user_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_updated_at_trigger
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_user_updated_at();

-- Trigger: Update message.updated_at whenever it's modified
CREATE OR REPLACE FUNCTION update_message_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_updated_at_trigger
BEFORE UPDATE ON messages
FOR EACH ROW
EXECUTE FUNCTION update_message_updated_at();

-- Trigger: Update fingerprint.last_updated when changed
CREATE OR REPLACE FUNCTION update_fingerprint_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fingerprint_updated_at_trigger
BEFORE UPDATE ON user_behavioral_fingerprints
FOR EACH ROW
EXECUTE FUNCTION update_fingerprint_updated_at();

-- Trigger: Update activity stats whenever a new message is created
-- WHY: Real-time dashboard stats without running expensive queries
CREATE OR REPLACE FUNCTION update_activity_stats_on_message()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_activity_stats (user_id, total_messages, last_message_at)
  VALUES (NEW.user_id, 1, NEW.created_at)
  ON CONFLICT (user_id) DO UPDATE SET
    total_messages = user_activity_stats.total_messages + 1,
    last_message_at = NEW.created_at,
    last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activity_stats_trigger
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_activity_stats_on_message();

-- ============================================================================
-- PART 6: PERFORMANCE (Indexes)
-- ============================================================================

-- WHY: Queries are fast when you index the columns you search/filter by
-- Without indexes, querying 1M messages would take 30 seconds

-- Messages: Fast lookup by user_id and created_at (for timelines)
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_created ON messages(user_id, created_at DESC);

-- Behavioral events: Fast lookup by user and event type
CREATE INDEX IF NOT EXISTS idx_behavioral_events_user_id ON behavioral_events(user_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_events_event_type ON behavioral_events(event_type);

-- Fingerprints: Fast lookup by user
CREATE INDEX IF NOT EXISTS idx_fingerprints_user_id ON user_behavioral_fingerprints(user_id);

-- Activity stats: Already unique on user_id (implicitly indexed)

-- ============================================================================
-- DONE
-- ============================================================================
-- This schema is production-ready with:
-- ✅ Auth infrastructure (NextAuth compatible)
-- ✅ Behavioral tracking (metadata + events)
-- ✅ Security (RLS at database level)
-- ✅ Performance (indexes on hot columns)
-- ✅ Real-time aggregates (dashboard-ready)
