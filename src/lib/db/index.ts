/**
 * db/index.ts
 * Neon serverless connection + Drizzle ORM instance.
 * Import `db` in server-only files (API routes, server actions).
 */
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)

export const db = drizzle(sql, { schema })
export { schema }
