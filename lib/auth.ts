import { type NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { upsertUser } from "@/lib/actions/user";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, profile }: any) {
      if (account && profile) {
        console.log("🔑 JWT: Starting upsert for github_id:", profile.id);
        console.log("🔑 JWT: Profile data:", { id: profile.id, login: profile.login, email: profile.email });
        
        const result = await upsertUser({
          id: String(profile.id),
          login: profile.login,
          name: profile.name,
          email: profile.email,
          avatar_url: profile.avatar_url,
        });
        
        console.log("🔑 JWT: upsertUser result:", result);

        if (result.success && result.user) {
          console.log("🔑 JWT: Setting token.id to UUID:", result.user.id);
          token.id = result.user.id;
        } else {
          console.log("🔑 JWT: FAILED - using fallback");
          token.id = profile.id;
        }
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
    async redirect({ url, baseUrl }: any) {
      if (url.startsWith(baseUrl)) return url;
      return baseUrl + "/dashboard";
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};