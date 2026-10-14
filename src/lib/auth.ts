/**
 * auth.ts
 * NextAuth.js v5 configuration — Google OAuth, JWT sessions, auto-create profile.
 * Exports: handlers, auth, signIn, signOut
 */
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],

  // JWT-based sessions (no session table required in Neon)
  session: { strategy: 'jwt' },

  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false
      // Use Google account providerAccountId as deterministic ID, fallback to user.id
      const idToUse = account?.providerAccountId || user.id || crypto.randomUUID()
      try {
        const existing = await db.query.profiles.findFirst({
          where: eq(profiles.email, user.email),
        })
        if (!existing) {
          await db.insert(profiles).values({
            id: idToUse,
            email: user.email,
          })
        }
      } catch (err) {
        console.error('[auth] signIn profile upsert error:', err)
        return false
      }
      return true
    },

    async jwt({ token, user, account }) {
      const email = user?.email || token.email
      if (email) {
        token.email = email
        try {
          // Resolve exact profile id from database so token.sub ALWAYS matches profiles.id
          const existing = await db.query.profiles.findFirst({
            where: eq(profiles.email, email),
            columns: { id: true },
          })
          if (existing?.id) {
            token.sub = existing.id
          } else if (account?.providerAccountId) {
            token.sub = account.providerAccountId
          }
        } catch (err) {
          console.error('[auth] jwt resolve profile error:', err)
          if (account?.providerAccountId) {
            token.sub = account.providerAccountId
          }
        }
      }
      return token
    },

    async session({ session, token }) {
      // Expose user ID from JWT sub to session
      if (token.sub) {
        session.user.id = token.sub
      }
      if (token.email) {
        session.user.email = token.email
      }
      return session
    },
  },

  // Redirect to landing with query param on auth failure
  pages: {
    error: '/?auth=error',
  },
})
