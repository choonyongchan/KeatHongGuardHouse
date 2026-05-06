import cron from 'node-cron'
import type { Bot } from 'grammy'
import type { MyContext } from './types.js'
import { getGroupsToExpire, getGroupsToWarn, setStatus, markExpiryWarned, getGroupMembers } from './db/groups.js'
import * as notificationService from './services/notificationService.js'

export function startScheduler(bot: Bot<MyContext>): void {
  // Expire groups that have passed their expiry time (includes open AND full groups)
  cron.schedule('* * * * *', async () => {
    try {
      const groups = await getGroupsToExpire()
      await Promise.allSettled(groups.map(async (group) => {
        await setStatus(group.id, 'expired')
        await notificationService.notifyGroupExpired(bot, group, group.creatorId)
      }))
      if (groups.length > 0) console.log(`[scheduler] Expired ${groups.length} groups`)
    } catch (e) {
      console.error('[scheduler] expire job error:', e)
    }
  })

  // Warn members of groups expiring within 15 minutes (once per group)
  cron.schedule('* * * * *', async () => {
    try {
      const groups = await getGroupsToWarn()
      await Promise.allSettled(groups.map(async (group) => {
        await markExpiryWarned(group.id)
        const members = await getGroupMembers(group.id)
        const memberIds = members.map(m => m.userId)
        await notificationService.notifyExpiryWarning(bot, group, memberIds)
      }))
      if (groups.length > 0) console.log(`[scheduler] Warned ${groups.length} groups`)
    } catch (e) {
      console.error('[scheduler] warn job error:', e)
    }
  })

  console.log('[scheduler] Started')
}
