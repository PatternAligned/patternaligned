# PatternAligned Phase 1: Foundation

## What You're Building

PatternAligned is **behavioral infrastructure for high-agency AI users**. Phase 1 is the foundation: users sign up, authenticate, and their interactions get recorded with behavioral metadata.

The system is designed so that:
- **Users sign up → Get verified → Stay logged in → Send messages → System learns patterns**
- **Security is at database level** (not app level) so data is protected even if code is compromised
- **Every interaction is tracked** (pause time, edit count, word choice) for Phase 2 fingerprinting
- **Real-time analytics** feed the dashboard so you can see patterns emerging

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Frontend)                      │
│  - Sign up / Sign in pages (dark mode, clean)                │
│  - Dashboard (shows messages + early patterns)               │
│  - Message composer with behavioral tracking                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ HTTPS (encrypted)
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                    Next.js API Routes                        │
│  - /api/auth/[...nextauth] - Authentication handler          │
│  - /api/chat - Send/receive messages                         │
│  - /api/analytics - Dashboard data                           │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ JWT Token (authenticated)
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                   External Services                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Supabase PostgreSQL                                    │  │
│  │ - users table → User identities                        │  │
│  │ - messages table → Every message + metadata           │  │
│  │ - behavioral_events → Pause, edit, type patterns      │  │
│  │ - fingerprints → Computed personality profiles        │  │
│  │ - RLS policies → Database-level security              │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Resend Email Service                                   │  │
│  │ - Sends verification emails from @patternaligned.com │  │
│  │ - Tracked webhooks for email events                   │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## How the System Works

### 1. Authentication Flow

```
User clicks "Sign Up"
    ↓
Enters email: user@example.com
    ↓
NextAuth sends to Resend
    ↓
Resend sends verification email from noreply@patternaligned.com
    ↓
User clicks link in email
    ↓
NextAuth verifies token
    ↓
Creates user in Supabase
    ↓
Sets JWT session cookie (24hr expiry)
    ↓
Redirects to dashboard
    ↓
User stays logged in on browser
```

### 2. Session Management

```
Browser makes request to /api/chat
    ↓
NextAuth middleware checks JWT token
    ↓
Token valid? Extract user_id
    ↓
Pass user_id to API handler
    ↓
API handler uses RLS: "Show only messages for this user_id"
    ↓
Supabase enforces at database level (user can never see others' data)
    ↓
Return only their data
```

### 3. Message + Behavioral Tracking

```
User starts typing message
    ↓
BehavioralTracker.startMessage() called
    ↓
Record start time + track "message_start" event
    ↓
As user types, track edits (editCount increments)
    ↓
If user pauses 2+ seconds, track "message_pause" event + duration
    ↓
User submits message
    ↓
BehavioralTracker.submitMessage() calculates:
  - pause_time_ms: How long paused before sending
  - edit_count: How many edits made
  - word_count: Total words
  - token_count: Approximate tokens (for AI cost tracking)
    ↓
Message stored in Supabase with all metadata
    ↓
Behavioral event also stored separately (for granular analysis)
    ↓
Activity stats updated (real-time aggregates)
```

---

## Database Schema (The Backbone)

### Users Table
```sql
id (UUID) - Unique identifier
email (TEXT) - Required, unique
email_verified (TIMESTAMP) - When they verified email
name (TEXT) - Display name
image (TEXT) - Profile picture
created_at - When they signed up
updated_at - When they last changed anything
```

**Why:** NextAuth needs this to know who you are.

### Messages Table
```sql
id (UUID) - Unique identifier
user_id (UUID FOREIGN KEY) - Which user sent this
role (TEXT) - 'user' or 'assistant'
content (TEXT) - The actual message
word_count (INT) - Words in message
token_count (INT) - Approximate tokens
pause_time_ms (INT) - How long they paused before sending
edit_count (INT) - How many times they edited
sentiment_score (FLOAT) - -1 (negative) to 1 (positive)
model_used (TEXT) - Which model responded
temperature (FLOAT) - Creativity level used
created_at - When sent
updated_at - When last modified
```

**Why:** This is the raw data. Every field (pause_time, edit_count, sentiment) feeds Phase 2 fingerprinting.

### Behavioral_Events Table
```sql
id (UUID) - Unique identifier
user_id (UUID FOREIGN KEY) - Which user
message_id (UUID FOREIGN KEY) - Which message (if applicable)
event_type (TEXT) - 'message_start', 'message_pause', 'message_edit', 'sidebar_open', etc
metadata (JSONB) - Flexible data about the event
created_at - When it happened
```

**Why:** Messages alone don't capture HOW someone behaves. This table captures EVERY interaction.

### User_Behavioral_Fingerprints Table
```sql
id (UUID) - Unique identifier
user_id (UUID FOREIGN KEY) - Which user
fingerprint (JSONB) - Computed personality profile
message_count (INT) - How many messages computed from
confidence_score (FLOAT) - 0-1, how confident we are
last_updated - When we last recomputed
created_at - When created
```

**Why:** Phase 2 will compute this. It stores the "personality profile" so you can detect drift (Phase 3).

### User_Activity_Stats Table
```sql
id (UUID) - Unique identifier
user_id (UUID FOREIGN KEY) - Which user
total_messages (INT) - All-time count
messages_today (INT) - Today's count
messages_this_week (INT) - This week's count
avg_pause_time_ms (INT) - Average pause time
avg_edit_count (FLOAT) - Average edits per message
avg_word_count (INT) - Average words per message
last_message_at (TIMESTAMP) - Most recent message
last_updated - When we computed this
```

**Why:** Dashboard queries this instead of raw messages. Pre-computed aggregates = fast queries.

---

## Security Model (RLS = Row Level Security)

### The Problem
If you just store data in a database, anyone who hacks the API key can read everything. 

### The Solution
**Row Level Security (RLS)**: Database itself enforces "you can only see your own data"

```
RLS Policy Example:
  
  CREATE POLICY "Users see only their own messages"
  ON messages FOR SELECT
  USING (auth.uid() = user_id);

What this does:
  - User tries: SELECT * FROM messages WHERE user_id = 'someone_else_id'
  - Supabase checks RLS policy: Is auth.uid() == someone_else_id?
  - Answer: No
  - Result: DENIED (returns 0 rows, not error)

Why this matters:
  - Even if JWT token is stolen, attacker can't read others' data
  - Even if API key is exposed, database enforces access control
  - This is database-level security, not app-level
```

---

## Phase Progression

### Phase 1 (Current): Foundation
- ✅ Auth system (signup, verify, login)
- ✅ Database schema with security
- ✅ Behavioral tracking hooks
- ✅ Session management
- Timeline: 1-2 weeks

### Phase 2: Personality & Learning
- [ ] Compute fingerprints from behavioral data
- [ ] Build fingerprint visualization
- [ ] Detect personality shifts
- [ ] Retraining pipeline
- Timeline: 2-3 weeks
- **First revenue possible**: Can charge based on fingerprint depth

### Phase 3: Drift Detection
- [ ] Compare current behavior to fingerprint
- [ ] Alert when user behaves differently (drift)
- [ ] Auto-retrain models based on drift
- Timeline: 2-3 weeks

### Phase 4: Scale + Polish
- [ ] Load testing (10K+ concurrent users)
- [ ] Analytics dashboard
- [ ] Monitoring + alerting
- [ ] Billing system (Stripe)
- [ ] SLA documentation
- Timeline: 2-3 weeks

---

## File Organization

```
lib/
  auth.js                    - NextAuth configuration
  behavioral-tracking.js     - Tracking hooks (pause, edit, etc)
  supabase.js               - Database helpers + subscriptions

pages/
  api/auth/[...nextauth].js - Auth endpoint
  auth/signin.jsx           - Login UI
  auth/signup.jsx           - Signup UI
  dashboard.jsx             - Main app (Phase 2+)

public/
  (static files like images, fonts)

.env.local                  - Secrets (never committed)
.gitignore                  - Files to not commit
```

---

## Why This Approach

| Decision | Alternative | Why We Chose This |
|----------|-------------|-------------------|
| NextAuth | Build custom auth | Proven, secure, easy integration |
| Supabase | Firebase, DynamoDB | PostgreSQL for complex queries + RLS |
| Passwordless email | Password login | More secure, better UX, no password DB |
| Behavioral tracking | Just store messages | Can't build fingerprints without patterns |
| RLS at DB level | Security in API | Database-level security is bulletproof |
| Resend for email | Hostinger email | API integration + webhooks for analytics |

---

## How to Explain This to People

**Short version (30 seconds):**
"PatternAligned is a behavioral infrastructure platform. Users sign up, we capture how they interact (pause time, edits, sentiment), and our system learns their personality. In Phase 2, we detect if their behavior changes (drift). In Phase 3, we retrain models automatically."

**Medium version (2 minutes):**
"Think of it like this: Every AI interaction tells you something about how someone thinks. If someone usually takes 2 seconds to compose, but suddenly takes 20 seconds, that's a signal. We capture that signal at scale. Our database stores 3 things: raw messages, behavioral events (every interaction), and computed fingerprints (personality profiles). The system is secure because the database itself (Supabase) enforces 'you can only see your own data' - not just the app code."

**Long version (10 minutes):**
Walk them through the architecture diagram + database schema above.

---

## What's Not Done Yet

- **Chat API** - `/api/chat` route for sending/receiving messages
- **Dashboard UI** - Real-time message feed + fingerprint viz
- **Admin dashboard** - Analytics for you (Pattern Aligned founder)
- **Fingerprint computation** - The actual ML algorithm
- **Deployment** - Getting this live on production

These are Phase 2+.

---

## Quick Start

1. Follow `09-SETUP-GUIDE.md` step by step
2. Test locally at `http://localhost:3000/auth/signup`
3. Try signing up with your real email
4. Verify you get the email + can log in
5. Check Supabase to see data flow

That's Phase 1.

---

## Support

Files included:
- `01-schema-enhancement.sql` - Database schema
- `02-env-local-example.txt` - Environment variables template
- `03-nextauth-config.js` - Auth configuration
- `04-nextauth-route-handler.js` - Auth endpoint
- `05-signin-page.jsx` - Login page
- `06-signup-page.jsx` - Signup page
- `07-behavioral-tracking.js` - Tracking library
- `08-supabase-client.js` - Database helpers
- `09-SETUP-GUIDE.md` - Step-by-step setup

Questions? Start with the setup guide.
