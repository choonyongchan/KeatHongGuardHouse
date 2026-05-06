import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  BOT_TOKEN:         z.string().min(1),
  DATABASE_URL:      z.string(),
  DEVELOPER_CHAT_ID: z.coerce.number().int(),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error)
  process.exit(1)
}

export const config = parsed.data
