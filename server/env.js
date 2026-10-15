import path from 'node:path'
import { existsSync } from 'node:fs'

// Candidate paths where .env might be located (server dir, root dir, cwd)
const candidateEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(import.meta.dirname, '.env'),
  path.resolve(import.meta.dirname, '../.env'),
]

for (const envPath of candidateEnvPaths) {
  if (existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath)
      break
    } catch {
      // Continue checking other candidates
    }
  }
}

// Fallback defaults so Prisma never crashes if DATABASE_URL is not provided
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db'
}

