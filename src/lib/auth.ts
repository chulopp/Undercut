/**
 * auth.ts
 * NextAuth.js v5 configuration — Google OAuth, JWT sessions, auto-create profile.
 * Exports: handlers, auth, signIn, signOut
 */
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],

  // JWT-based sessions (no session table required in Neon)
  session: { strategy: 'jwt' },

  callbacks: {
    async signIn({ user }) {
      if (!user.id || !user.email) return false
      // Auto-create profile row on first sign-in (replaces Supabase trigger handle_new_user)
      try {
        await db
          .insert(profiles)
          .values({ id: user.id, email: user.email })
          .onConflictDoNothing()
      } catch (err) {
        console.error('[auth] signIn profile upsert error:', err)
        return false
      }
      return true
    },

    async jwt({ token, account, profile }) {
      // Persist Google sub as token.sub on first sign-in
      if (account?.providerAccountId) {
        token.sub = account.providerAccountId
      }
      return token
    },

    async session({ session, token }) {
      // Expose user ID from JWT sub to session
      if (token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },

  // Redirect to landing with query param on auth failure
  pages: {
    error: '/?auth=error',
  },
})
