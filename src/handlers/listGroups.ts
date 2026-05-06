import type { Bot } from 'grammy'
import { InlineKeyboard } from 'grammy'
import type { MyContext, FoodGroup, GroupMember } from '../types.js'
import * as groupService from '../services/groupService.js'
import * as notificationService from '../services/notificationService.js'
import { getGroupByCode, getGroupById, getGroupMembers, isMember, removeMember, setStatus } from '../db/groups.js'
import { upsertUser, getUser } from '../db/users.js'
import {
  CB, backToListKeyboard, groupListKeyboard, nonMemberCardKeyboard,
  memberCardKeyboard, leaderCardKeyboard,
} from '../utils/keyboards.js'
import { formatGroupCardHeader, formatMemberList, escapeMd } from '../utils/formatters.js'
import { sendOrEdit, cbCode, answerAndRender, buildCardKeyboard } from '../utils/telegram.js'
import {
  NO_GROUPS_AVAILABLE,
  GROUPS_LIST_HEADER,
  shareGroupGuide,
  LEAVE_GROUP_ALERT,
  LEAVE_GROUP_LEADER_ALERT,
  LEAVE_GROUP_NOT_FOUND,
  cancelSuccessEditMessage,
} from '../templates.js'

// ── Shared renderers ───────────────────────────────────────────

export async function renderList(ctx: MyContext): Promise<void> {
  const groups = await groupService.getGroupsForDisplay()
  if (groups.length === 0) {
    await sendOrEdit(ctx,
      NO_GROUPS_AVAILABLE,
      {
        reply_markup: new InlineKeyboard()
          .text('➕ New Group', CB.MENU_NEW)
          .text('🏠 Main Menu', CB.MENU_MAIN),
        parse_mode: 'Markdown',
      }
    )
  } else {
    await sendOrEdit(ctx,
      GROUPS_LIST_HEADER,
      { reply_markup: groupListKeyboard(groups), parse_mode: 'Markdown' }
    )
  }
}

async function renderGroupCard(ctx: MyContext, code: string, userId: number): Promise<void> {
  const result = await groupService.getGroupDetail(code)
  if (!result.ok) {
    await ctx.answerCallbackQuery({ text: result.error, show_alert: true })
    return
  }
  const { group, members } = result.data
  const isLeader = group.creatorId === userId
  const memberFlag = await isMember(group.id, userId)
  const header = formatGroupCardHeader(group, members[0] ?? null)

  if (isLeader || memberFlag) {
    const actionKb = isLeader ? leaderCardKeyboard(code) : memberCardKeyboard(code)
    await ctx.editMessageText(
      `${header}\n\n${formatMemberList(members)}`,
      { reply_markup: buildCardKeyboard(group.externalLink, actionKb), parse_mode: 'Markdown' }
    )
  } else {
    await ctx.editMessageText(header, {
      reply_markup: nonMemberCardKeyboard(code, group.status === 'full'),
      parse_mode: 'Markdown',
    })
  }
}

// ── Notification helper ────────────────────────────────────────

async function fireJoinNotifications(
  ctx: MyContext,
  userId: number,
  group: FoodGroup,
  members: GroupMember[]
): Promise<void> {
  const bot = ctx.api as unknown as Bot<MyContext>
  const newMemberUser = await getUser(userId)
  if (!newMemberUser) return
  const otherIds = members.map(m => m.userId).filter(id => id !== userId)
  void notificationService.notifyMemberJoined(bot, group, newMemberUser, otherIds)
  const freshGroup = await getGroupById(group.id)
  if (freshGroup?.status === 'full') {
    void notificationService.notifyGroupFull(bot, freshGroup, members.map(m => m.userId))
  }
}

// ── Exported handlers ──────────────────────────────────────────

export async function listCommand(ctx: MyContext): Promise<void> {
  if (!ctx.from) return
  await renderList(ctx)
}

export async function refreshList(ctx: MyContext): Promise<void> {
  if (!ctx.from) return
  await answerAndRender(ctx, renderList)
}

export async function viewGroupHandler(ctx: MyContext): Promise<void> {
  if (!ctx.from) return
  const code = cbCode(ctx.callbackQuery!.data ?? '')
  const userId = ctx.from.id
  await answerAndRender(ctx, c => renderGroupCard(c, code, userId))
}

export async function joinGroupHandler(ctx: MyContext): Promise<void> {
  if (!ctx.from) return
  const code = cbCode(ctx.callbackQuery!.data ?? '')
  await upsertUser(ctx.from.id, ctx.from.username ?? null, ctx.from.first_name)
  const result = await groupService.joinGroup(code, ctx.from.id)
  if (!result.ok) {
    await ctx.answerCallbackQuery({ text: result.error, show_alert: true })
    return
  }
  await ctx.answerCallbackQuery('✅ Joined!')
  await renderGroupCard(ctx, code, ctx.from.id)
  const members = await getGroupMembers(result.data.id)
  void fireJoinNotifications(ctx, ctx.from.id, result.data, members)
}

export async function leaveGroupHandler(ctx: MyContext): Promise<void> {
  if (!ctx.from) return
  const code = cbCode(ctx.callbackQuery!.data ?? '')
  const group = await getGroupByCode(code)
  if (!group) { await ctx.answerCallbackQuery({ text: LEAVE_GROUP_NOT_FOUND, show_alert: true }); return }
  if (group.creatorId === ctx.from.id) {
    await ctx.answerCallbackQuery({ text: LEAVE_GROUP_LEADER_ALERT, show_alert: true })
    return
  }
  await removeMember(group.id, ctx.from.id)
  // group captured pre-removal; if it was full, reopen now that a slot freed up
  if (group.status === 'full') await setStatus(group.id, 'open')
  await ctx.answerCallbackQuery(LEAVE_GROUP_ALERT)
  await renderList(ctx)
}

export async function cancelGroupHandler(ctx: MyContext): Promise<void> {
  if (!ctx.from) return
  const code = cbCode(ctx.callbackQuery!.data ?? '')
  const result = await groupService.cancelGroup(code, ctx.from.id)
  if (!result.ok) { await ctx.answerCallbackQuery({ text: result.error, show_alert: true }); return }
  const group = result.data
  await ctx.answerCallbackQuery()
  const members = await getGroupMembers(group.id)
  const nonCreatorIds = members.map(m => m.userId).filter(id => id !== ctx.from!.id)
  void notificationService.notifyGroupCancelled(ctx.api as unknown as Bot<MyContext>, group, nonCreatorIds)
  await ctx.editMessageText(
    cancelSuccessEditMessage(escapeMd(group.title), nonCreatorIds.length),
    { reply_markup: backToListKeyboard(), parse_mode: 'Markdown' }
  )
}

export async function shareGroupHandler(ctx: MyContext): Promise<void> {
  if (!ctx.from) return
  const code = cbCode(ctx.callbackQuery!.data ?? '')
  await ctx.answerCallbackQuery()
  await ctx.reply(shareGroupGuide(code), {
    reply_markup: backToListKeyboard(),
    parse_mode: 'Markdown',
  })
}
