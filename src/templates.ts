/**
 * Centralized message templates for the KeatHongGuardHouse bot.
 * All user-facing messages are defined here for easy maintenance and updates.
 */

// ── Main Menu Messages ─────────────────────────────────────────────
export const WELCOME_MESSAGE =
  '👋 Welcome to *KeatHongGuardHouse!*\n\nFind people to group order food with.\nTap a button to get started.'

// ── Help Command ──────────────────────────────────────────────────
export const HELP_TEXT =
  '🍱 *KeatHongGuardHouse* — group food orders, made easy.\n\n' +
  '*How it works:*\n' +
  '1. Someone creates a group order with a GrabFood link\n' +
  '2. Others browse and join\n' +
  '3. Once full or the timer runs out, everyone orders together\n\n' +
  '*Commands:*\n' +
  '/start — Main menu\n' +
  '/list — Browse open groups\n' +
  '/new — Create a group order\n' +
  '/join <code> — Join directly by code\n' +
  '/cancel <code> — Cancel your group\n' +
  '/subscribe — Toggle notifications\n' +
  '/feedback — Send feedback\n' +
  '/help — This message'

// ── Subscribe Messages ────────────────────────────────────────────
export function subscribeText(subscribed: boolean): string {
  return subscribed
    ? '🔔 You are *subscribed* to new group notifications.'
    : '🔕 You are *not subscribed* to new group notifications.'
}

// ── Feedback Messages ────────────────────────────────────────────
export const FEEDBACK_PROMPT =
  '📣 *Send Feedback*\n\nBug report, suggestion, or just want to say hi?\nType your message below.\nType /cancel to go back.'

export const FEEDBACK_EMPTY_ERROR = 'Message cannot be empty. Try again:'
export const FEEDBACK_TOO_LONG_ERROR = 'Too long (max 1000 chars). Please shorten:'
export const FEEDBACK_SENT_SUCCESS =
  '✅ *Feedback sent!*\nThanks — the developer will read this.'
export const FEEDBACK_CANCELLED = 'Cancelled.'

// ── Group Creation Messages ──────────────────────────────────────
export const NEW_GROUP_START =
  '➕ *New Group Order*\nLet\'s set one up. Type /cancel at any step to quit.\n\n' +
  '*Step 1 of 4:* What\'s the title of your group order?\n_(e.g. \'Supper at Al-Ameen\')_'

export const NEW_GROUP_TITLE_EMPTY_ERROR = 'Title cannot be empty. Try again:'
export const NEW_GROUP_TITLE_TOO_LONG_ERROR = 'Title too long (max 60 chars). Try again:'

export const NEW_GROUP_LINK_PROMPT =
  '*Step 2 of 4:* Paste your group order link.'

export const NEW_GROUP_INVALID_LINK_ERROR =
  'Please enter a valid link starting with http. Try again:'

export const NEW_GROUP_MAX_MEMBERS_PROMPT =
  '*Step 3 of 4:* How many people total (including you)?'

export const NEW_GROUP_CUSTOM_MAX_PROMPT = 'Enter a number between 2 and 20:'
export const NEW_GROUP_INVALID_MAX_ERROR = 'Please enter a number between 2 and 20:'
export const NEW_GROUP_MAX_BUTTON_ERROR =
  'Please use the buttons above to select the number of members.'

export const NEW_GROUP_EXPIRY_PROMPT =
  '*Step 4 of 4:* When should this group expire?'

export const NEW_GROUP_CUSTOM_EXPIRY_PROMPT = 'Enter minutes until expiry (15–480):'
export const NEW_GROUP_INVALID_EXPIRY_ERROR =
  'Please enter a number between 15 and 480:'
export const NEW_GROUP_EXPIRY_BUTTON_ERROR =
  'Please use the buttons above to select the expiry time.'

export function newGroupCreationCancelled(): string {
  return 'Group creation cancelled.'
}

export function newGroupReview(
  title: string,
  grabLink: string,
  maxMembers: number,
  expiryFormatted: string
): string {
  return (
    `✅ *Review your group:*\n\n🍱 ${title}\n🔗 ${grabLink}\n👥 Max: ${maxMembers}\n` +
    `⏰ Expires: ${expiryFormatted}\n\nConfirm?`
  )
}

export function newGroupCreated(title: string, code: string): string {
  return (
    `🎉 *Group created!*\n\n🍱 ${title}\n🆔 Code: ${code}\n\n` +
    `Share with friends:\n👉 /join ${code}\n\nYou'll be notified when members join or when it's about to expire.`
  )
}

export const NEW_GROUP_CREATION_ERROR_PREFIX = '❌ '
export const NEW_GROUP_CREATION_CANCELLED = 'Group creation cancelled.'

// ── List Groups Messages ──────────────────────────────────────────
export const NO_GROUPS_AVAILABLE =
  '😴 *No open groups right now.*\n\nBe the first to start one!'

export const GROUPS_LIST_HEADER =
  '🍱 *Food Groups*\nTap a group to see details and join.'

export const SHARE_GROUP_ALERT_PREFIX = 'Share this with friends:\n\n/join '
export const SHARE_GROUP_ALERT_SUFFIX = '\n\nThey can type it in this bot!'

// ── Join Group Messages ──────────────────────────────────────────
export const JOIN_NO_CODE_ERROR =
  'Please provide a group code.\nExample: /join MANGO'

export const JOIN_SUCCESS_PREFIX = '✅ *Joined!*\n\n'

export const JOIN_ALERT_SUCCESS = '✅ Joined!'

// ── Cancel Group Messages ─────────────────────────────────────────
export const CANCEL_NO_CODE_USAGE =
  'Usage: /cancel <code>\nExample: /cancel MANGO'

export function cancelSuccess(title: string, memberCount: number): string {
  return `✅ *${title}* cancelled. ${memberCount} member(s) notified.`
}

export function cancelSuccessEditMessage(
  title: string,
  memberCount: number
): string {
  return `✅ *${title}* has been cancelled. ${memberCount} member(s) notified.`
}

// ── Leave Group Messages ──────────────────────────────────────────
export const LEAVE_GROUP_ALERT =
  'You have left the group.'

export const LEAVE_GROUP_LEADER_ALERT =
  "You're the leader. Use Cancel Group instead."

export const LEAVE_GROUP_NOT_FOUND = 'Group not found.'

// ── Notification Messages ─────────────────────────────────────────
export function notifyNewGroup(
  title: string,
  maxMembers: number,
  expiryFormatted: string,
  code: string
): string {
  return (
    `🍱 *New Group Order!*\n\n${title}\n` +
    `👥 ${maxMembers} spots  ·  ⏰ expires ${expiryFormatted}\n\n` +
    `Type /join ${code} or tap below to join.`
  )
}

export function notifyMemberJoined(
  memberName: string,
  groupTitle: string,
  currentCount: number,
  maxMembers: number
): string {
  return `${memberName} joined *${groupTitle}*! (${currentCount}/${maxMembers})`
}

export function notifyGroupFull(title: string, externalLink: string): string {
  return (
    `🎉 *${title}* is full! Time to order.\n\nOpen GrabFood: ${externalLink}`
  )
}

export function notifyExpiryWarning(
  title: string,
  externalLink: string
): string {
  return (
    `⚠️ *${title}* is expiring in under 15 minutes!\n\nOpen GrabFood now: ${externalLink}`
  )
}

export function notifyGroupExpired(title: string, code: string): string {
  return `⏰ Your group *${title}* (${code}) has expired and been closed.`
}

export function notifyGroupCancelled(title: string, code: string): string {
  return `❌ The group order *${title}* (${code}) has been cancelled by the leader.`
}

// ── Error Messages ────────────────────────────────────────────────
export const ERROR_PREFIX = '❌ '
export const ERROR_NOT_FOUND = 'Group not found.'
