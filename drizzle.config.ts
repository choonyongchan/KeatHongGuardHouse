import { defineConfig } from 'drizzle-kit';

try {
  process.loadEnvFile('.env.local');
} catch {
  // .env.local absent (e.g. CI/production) — POSTGRES_URL is already in env.
}

export default defineConfig({
  schema: './api/_schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
});
