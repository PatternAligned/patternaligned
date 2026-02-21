// lib/auth.js
// NextAuth configuration for PatternAligned
// WHY: NextAuth handles session management, token validation, and user state
// We use Supabase adapter so users/sessions are stored in Supabase
// We use Resend provider so verification emails come from your domain

import { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { SupabaseAdapter } from "@next-auth/supabase-adapter";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// NextAuth configuration
export const authOptions = {
  // Adapter: How to store users/sessions
  // Supabase adapter automatically creates/manages users in your Supabase database
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }),

  // Providers: HOW users authenticate
  // We're using email (passwordless magic links)
  // Later you can add GitHub, Google, etc
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,

      // Custom send function using Resend instead of default SMTP
      async sendVerificationRequest({ identifier: email, url, provider }) {
        // Extract the token from the verification URL
        const token = url.split("token=")[1];

        try {
          await resend.emails.send({
            from: process.env.SYSTEM_EMAIL || "noreply@patternaligned.com",
            to: email,
            subject: "Sign in to PatternAligned",
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; }
                    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                    .header { font-size: 24px; font-weight: 600; margin-bottom: 20px; color: #1a1a1a; }
                    .message { font-size: 16px; line-height: 1.5; margin-bottom: 30px; color: #4a4a4a; }
                    .button { 
                      display: inline-block; 
                      padding: 12px 24px; 
                      background: #000; 
                      color: #fff; 
                      text-decoration: none; 
                      border-radius: 4px; 
                      font-weight: 600; 
                    }
                    .footer { margin-top: 40px; font-size: 14px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">Sign in to PatternAligned</div>
                    <div class="message">
                      Click the link below to verify your email and sign in.
                    </div>
                    <a href="${url}" class="button">Verify Email & Sign In</a>
                    <div class="message" style="margin-top: 30px; font-size: 14px; color: #999;">
                      Or copy this link if the button doesn't work:<br/>
                      ${url}
                    </div>
                    <div class="footer">
                      <p>This link expires in 24 hours.</p>
                      <p>If you didn't request this email, you can safely ignore it.</p>
                    </div>
                  </div>
                </body>
              </html>
            `,
          });
        } catch (error) {
          console.error("Failed to send verification email", error);
          throw new Error("Failed to send verification email");
        }
      },
    }),
  ],

  // Callbacks: Hooks that run at key authentication moments
  callbacks: {
    // JWT callback: What data goes into the JWT token
    // WHY: Your session needs the user ID so we can query their data later
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    // Session callback: What data gets returned when you call useSession()
    // WHY: Frontend needs user ID and email to query their data
    async session({ session, token }) {
      session.user.id = token.id;
      return session;
    },

    // SignIn callback: Runs after successful authentication
    // WHY: Good place to set up initial user data, log analytics, etc
    async signIn({ user, email }) {
      // TODO: Trigger behavioral event "user_signup" for analytics
      console.log(`User signed in: ${user.email}`);
      return true;
    },
  },

  // Session strategy: How NextAuth stores sessions
  // "jwt" = sessions stored in browser (fast, stateless)
  // We're using JWT for speed
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Refresh every 24 hours
  },

  // Pages: Where to redirect for login/error/etc
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  // Debug: Log auth events in development
  debug: process.env.NODE_ENV === "development",
};
