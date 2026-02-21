# PatternAligned Phase 1 - Complete Setup Guide

## Overview
You're building the authentication + database foundation for PatternAligned. By the end of this, users can sign up, verify their email, stay logged in, and their data (including behavioral metadata) gets stored in Supabase.

This guide assumes:
- You have a Next.js project initialized (`npx create-next-app@latest`)
- You have a Supabase project created (free tier is fine)
- You have Resend account (free tier is fine)
- You're comfortable with terminal commands

---

## Step 1: Supabase Schema Setup (5 minutes)

### Why
The database schema is the foundation. Without it, you can't store anything. This schema does 3 things:
1. Creates NextAuth-compatible tables (users, accounts, sessions)
2. Creates PatternAligned tables (messages, behavioral events, fingerprints)
3. Adds security (RLS) so users can NEVER see other users' data

### What to Do
1. Go to https://supabase.com/dashboard
2. Click on your PatternAligned project
3. Click "SQL Editor" (left sidebar)
4. Click "New Query" (top left)
5. Paste the entire contents of `01-schema-enhancement.sql`
6. Click "Run" (green button, bottom right)
7. Wait for "Success" message

**Why this matters:** RLS policies mean a hacker can't steal your user data even if they compromise the JWT token. It's database-level security, not app-level. This is critical.

---

## Step 2: Environment Variables Setup (5 minutes)

### Why
Environment variables are how your code accesses Supabase, Resend, and NextAuth without hardcoding secrets. Different environments (dev vs production) need different values.

### What to Do

1. **Get your Supabase keys:**
   - Go to Supabase Dashboard → Settings (gear icon) → API tab
   - Copy `Project URL` and `Anon public key`
   - Leave the `Service role key` in Supabase (don't copy it yet)

2. **Create `.env.local` in your project root:**
   ```bash
   touch .env.local
   ```

3. **Edit `.env.local` and add:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://veekevmjstylbmgyomre.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   NEXTAUTH_SECRET=your-random-secret-here
   NEXTAUTH_URL=http://localhost:3000
   RESEND_API_KEY=your-resend-api-key
   SYSTEM_EMAIL=noreply@patternaligned.com
   PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Generate NEXTAUTH_SECRET:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   Copy the output and paste it as `NEXTAUTH_SECRET` value

5. **Get Resend API key:**
   - Go to https://resend.com
   - Sign up (free)
   - Go to API Keys
   - Create new key
   - Copy and paste as `RESEND_API_KEY`

6. **Copy service role key from Supabase:**
   - Go back to Supabase Dashboard → Settings → API
   - Scroll down to "Secret keys"
   - Copy the service role key (marked SECRET)
   - Add to `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`

**Important:** `.env.local` is never committed to Git (add to `.gitignore`). It stays on your machine only.

---

## Step 3: Install Dependencies (3 minutes)

### Why
You need libraries for authentication (NextAuth), database connection (Supabase), and email (Resend).

### What to Do
```bash
npm install next-auth @next-auth/supabase-adapter @supabase/supabase-js resend
```

---

## Step 4: File Structure Setup (5 minutes)

### Why
Organized file structure means you (and future developers) can find things. It also matches Next.js conventions so everything "just works."

### What to Do
Create this folder structure in your project:

```
your-project/
├── pages/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth].js          <- Create this
│   ├── auth/
│   │   ├── signin.jsx                    <- Create this
│   │   └── signup.jsx                    <- Create this
│   └── dashboard.jsx                     <- Create this (we'll add content later)
├── lib/
│   ├── auth.js                           <- Create this
│   ├── behavioral-tracking.js            <- Create this
│   ├── supabase.js                       <- Create this
└── .env.local                            <- Already created
```

### Commands
```bash
mkdir -p pages/auth
mkdir -p lib

# Create the files (we'll paste content next)
touch pages/api/auth/\[...nextauth\].js
touch pages/auth/signin.jsx
touch pages/auth/signup.jsx
touch pages/dashboard.jsx
touch lib/auth.js
touch lib/behavioral-tracking.js
touch lib/supabase.js
```

---

## Step 5: Copy Code Files (15 minutes)

### Why
These are the actual implementation files that make authentication work. Each one has specific responsibilities.

### What to Do

1. **`lib/auth.js`** - NextAuth configuration
   - Copy entire contents from `03-nextauth-config.js`
   - This tells NextAuth: use Supabase for storage, use Resend for email

2. **`pages/api/auth/[...nextauth].js`** - NextAuth route handler
   - Copy entire contents from `04-nextauth-route-handler.js`
   - This is the endpoint that handles ALL auth requests

3. **`pages/auth/signin.jsx`** - Login page
   - Copy entire contents from `05-signin-page.jsx`
   - Users go here to sign in with email

4. **`pages/auth/signup.jsx`** - Signup page
   - Copy entire contents from `06-signup-page.jsx`
   - New users go here

5. **`lib/behavioral-tracking.js`** - Behavioral tracking system
   - Copy entire contents from `07-behavioral-tracking.js`
   - This captures HOW users interact (pause time, edits, etc)

6. **`lib/supabase.js`** - Supabase client helpers
   - Copy entire contents from `08-supabase-client.js`
   - Helper functions for querying data

**Pro tip:** Do this one file at a time. Test as you go.

---

## Step 6: Update `_app.js` (5 minutes)

### Why
NextAuth needs to wrap your app so session state is available everywhere. This is similar to wrapping with Redux or Context.

### What to Do

Edit `pages/_app.js`:

```jsx
import { SessionProvider } from "next-auth/react";

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}

export default MyApp;
```

**Why:** SessionProvider gives all your pages access to `useSession()` hook so they know who's logged in.

---

## Step 7: Configure Resend Domain (5 minutes)

### Why
Resend needs to verify you own @patternaligned.com before it'll send emails from that domain. This prevents spam.

### What to Do

1. Go to https://resend.com → Domains (left sidebar)
2. Click "Add Domain"
3. Enter: `patternaligned.com`
4. Resend will give you DNS records to add
5. Go to Hostinger → Domains → patternaligned.com → DNS Zone
6. Add the CNAME record Resend gave you
7. Wait 5-10 minutes for DNS to propagate
8. Back in Resend → Click "Verify" on the domain

**What this does:** When a user gets a verification email, it comes from `noreply@patternaligned.com` (professional) instead of `noreply@resendmail.com` (looks generic).

---

## Step 8: Test Locally (10 minutes)

### Why
Before deploying, make sure everything works on your machine. This is where you catch bugs early.

### What to Do

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Open browser to http://localhost:3000/auth/signup**

3. **Try to sign up:**
   - Enter any email (can be fake for testing)
   - Click "Send Verification Link"

4. **Expected result:**
   - You should see: "Check your email for a sign-in link"
   - BUT you won't actually receive the email yet (need to fix Resend setup)
   - Check browser console for any errors

5. **Check Supabase:**
   - Go to Supabase Dashboard → SQL Editor
   - Run: `SELECT * FROM users;`
   - You should see a new user created (but not verified yet)

**If something breaks:**
- Check terminal for error messages
- Check browser console (F12 → Console tab)
- Check Supabase for errors

---

## Step 9: Test Email Flow (5 minutes)

### Why
The entire auth system fails if users don't get verification emails.

### What to Do

1. **Make sure Resend domain is verified** (from Step 7)

2. **Try signing up again:**
   - Go to http://localhost:3000/auth/signup
   - Use a REAL email address you can check
   - Click "Send Verification Link"

3. **Check your email inbox:**
   - Look for "Sign in to PatternAligned"
   - Click the link

4. **Expected result:**
   - Link should redirect you to dashboard
   - You should be logged in

**If you don't get the email:**
- Check spam folder
- Check Resend dashboard → Logs to see what went wrong
- Make sure domain verification completed in Step 7

---

## Step 10: Create Dashboard (Optional for today)

### Why
Once logged in, users need somewhere to go. The dashboard is where they see their messages and behavioral data.

### What to Do (if you have time)

Create `pages/dashboard.jsx`:

```jsx
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div style={{ padding: "40px" }}>
      <h1>Welcome, {session.user.email}</h1>
      <p>User ID: {session.user.id}</p>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}
```

This is just a placeholder. In Phase 2, we'll build the real dashboard with:
- Real-time message feed
- Fingerprint visualization
- Behavioral analytics

---

## Congratulations! You've Built:

✅ **Authentication System** - Users can sign up, verify email, stay logged in
✅ **Database Schema** - Users, messages, behavioral events, fingerprints
✅ **Security** - RLS policies prevent users from seeing each other's data
✅ **Behavioral Tracking Infrastructure** - Ready to capture interaction patterns
✅ **Professional Email** - Verification emails from @patternaligned.com

---

## Next Steps (Phase 1 Continued)

1. **Polish the UI** - Add dashboard, real-time chat component
2. **Test at scale** - Invite 3-5 people to sign up, see if it breaks
3. **Analytics** - Track signup flow, drop-off points
4. **Deploy to production** - Make it live (Vercel, your own server, etc)

---

## Troubleshooting

### "RLS policy error"
- Make sure you ran the SQL schema (Step 1)
- Make sure you're authenticated (NextAuth session set)

### "Can't send emails"
- Make sure Resend domain is verified (Step 7)
- Check Resend logs for errors

### "Database connection refused"
- Make sure `NEXT_PUBLIC_SUPABASE_URL` is correct
- Make sure `SUPABASE_SERVICE_ROLE_KEY` is correct

### "NextAuth session not working"
- Make sure `SessionProvider` wraps your app in `_app.js`
- Make sure `NEXTAUTH_SECRET` is set in `.env.local`

---

## Resources

- NextAuth docs: https://next-auth.js.org
- Supabase docs: https://supabase.com/docs
- Resend docs: https://resend.com/docs

---

**Questions?** This is your foundation. Everything else builds on top of this.
