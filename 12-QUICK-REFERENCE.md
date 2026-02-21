# PatternAligned Phase 1 - Quick Reference

## Common Commands

### Development
```bash
npm run dev              # Start dev server on localhost:3000
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Check for code errors
```

### Testing Auth
```bash
# Test signup flow
- Go to http://localhost:3000/auth/signup
- Enter email: test@example.com
- Check email for verification link
- Click link to sign in

# Test login flow
- Go to http://localhost:3000/auth/signin
- Same process

# View session data
- Open browser console (F12 → Console)
- Type: fetch('/api/auth/session').then(r => r.json()).then(console.log)
```

### Database Queries (in Supabase)

```sql
-- See all users
SELECT id, email, email_verified, created_at FROM users;

-- See all messages for a user
SELECT * FROM messages WHERE user_id = 'USER_ID_HERE' ORDER BY created_at DESC;

-- See behavioral events
SELECT event_type, metadata, created_at FROM behavioral_events WHERE user_id = 'USER_ID_HERE';

-- See user stats
SELECT * FROM user_activity_stats WHERE user_id = 'USER_ID_HERE';

-- Test RLS (should fail if not logged in as that user)
SELECT * FROM messages WHERE user_id != auth.uid();
```

---

## Troubleshooting

### "Cannot find module 'next-auth'"
**Problem:** Missing dependencies
**Fix:**
```bash
npm install next-auth @next-auth/supabase-adapter @supabase/supabase-js resend
```

### "SUPABASE_URL is undefined"
**Problem:** .env.local not loaded
**Fix:**
1. Make sure .env.local exists in project root
2. Restart dev server: `npm run dev`
3. Check .env.local has NEXT_PUBLIC_SUPABASE_URL

### "RLS policy violation"
**Problem:** User trying to access data they don't own
**Cause:** This is actually working correctly (security is working)
**Context:**
- If you're testing, make sure you're logged in as the right user
- Check that your RLS policies are correct in Supabase

### "Can't send verification emails"
**Problem:** Email not arriving in inbox
**Debug steps:**
1. Check Resend dashboard → Logs
2. Make sure Resend domain is verified (Step 7 in setup guide)
3. Check spam folder
4. Try with different email address
5. Check that RESEND_API_KEY is set in .env.local

### "JWT token expired"
**Problem:** Session expired after 24 hours
**Expected behavior:** This is correct
**Fix:** User signs in again

### "Supabase connection refused"
**Problem:** Can't connect to database
**Fix:**
1. Check NEXT_PUBLIC_SUPABASE_URL is correct
2. Check internet connection
3. Check Supabase status at https://status.supabase.com

### "NextAuth callback error"
**Problem:** Auth not working
**Debug:**
1. Check browser console (F12 → Console) for errors
2. Check server logs (terminal)
3. Make sure NEXTAUTH_SECRET is set
4. Make sure NEXTAUTH_URL matches your domain (localhost:3000 for dev)

---

## File Checklist

Before starting, you should have:

```
□ .env.local (created from template)
  □ NEXT_PUBLIC_SUPABASE_URL
  □ NEXT_PUBLIC_SUPABASE_ANON_KEY
  □ SUPABASE_SERVICE_ROLE_KEY
  □ NEXTAUTH_SECRET
  □ NEXTAUTH_URL
  □ RESEND_API_KEY

□ Database schema (Step 1 of setup guide)
  □ Ran SQL in Supabase
  □ No errors

□ pages/api/auth/[...nextauth].js
  □ Imports auth config
  □ Exports NextAuth handler

□ pages/auth/signin.jsx
  □ Form with email input
  □ Calls signIn from NextAuth

□ pages/auth/signup.jsx
  □ Form with name + email
  □ Calls signIn from NextAuth

□ lib/auth.js
  □ NextAuth configuration
  □ Supabase adapter
  □ Resend email provider

□ lib/supabase.js
  □ Supabase client creation
  □ Helper functions for queries

□ lib/behavioral-tracking.js
  □ BehavioralTracker class
  □ Event tracking functions

□ pages/_app.js
  □ SessionProvider wrapping app
  □ Imports from next-auth/react
```

---

## URLs Reference

**During development:**
- http://localhost:3000 - Main app
- http://localhost:3000/auth/signup - Signup
- http://localhost:3000/auth/signin - Login
- http://localhost:3000/api/auth/signin - NextAuth signin endpoint (internal)

**Services:**
- https://supabase.com/dashboard - Database
- https://resend.com - Email service
- https://github.com - Version control (next step)

---

## Environment Variables Reference

| Variable | Example | Where From |
|----------|---------|-----------|
| NEXT_PUBLIC_SUPABASE_URL | https://xxx.supabase.co | Supabase → Settings → API |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | eyJhbGc... | Supabase → Settings → API |
| SUPABASE_SERVICE_ROLE_KEY | eyJhbGc... | Supabase → Settings → API (Secret) |
| NEXTAUTH_SECRET | base64string | Generate with: node -e "..." |
| NEXTAUTH_URL | http://localhost:3000 | Your app URL |
| RESEND_API_KEY | re_xxx | Resend → API Keys |
| SYSTEM_EMAIL | noreply@patternaligned.com | Your email domain |
| PUBLIC_APP_URL | http://localhost:3000 | Same as NEXTAUTH_URL |

---

## Git Setup (for later)

```bash
# Initialize git
git init

# Create .gitignore (never commit secrets)
echo ".env.local" >> .gitignore
echo ".env" >> .gitignore
echo "node_modules" >> .gitignore

# First commit
git add .
git commit -m "PatternAligned Phase 1: Auth + Schema + Behavioral Tracking"

# Add to GitHub
git remote add origin https://github.com/yourusername/patternaligned.git
git push -u origin main
```

---

## Next Steps After Phase 1

1. **Polish Auth Pages** - Better error messages, loading states
2. **Build Chat Interface** - Message input/output component
3. **Create Dashboard** - Show user's messages + early stats
4. **Phase 2** - Fingerprint computation + visualization
5. **Deploy** - Get it live (Vercel, AWS, etc)

---

## Key Concepts to Remember

**JWT Token:** Stateless session stored in browser cookie. Contains user ID + expiry.

**RLS:** Row-level security at database level. User can never query another user's data.

**Behavioral Events:** Every interaction (type, pause, edit) gets recorded separately from messages.

**Fingerprints:** Will compute personality profile from behavioral data (Phase 2).

**Session:** How your app knows who's logged in. Provided by NextAuth.

---

## When to Ask for Help

1. **Code won't run** - Check terminal for error message, Google it
2. **Email not working** - Check Resend logs
3. **Database errors** - Check Supabase SQL editor for schema
4. **Auth flow broken** - Check NextAuth docs + Supabase adapter docs
5. **Everything else** - Read the error message + README

---

**Good luck. You got this. 🚀**
