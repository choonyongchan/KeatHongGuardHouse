import { InlineKeyboard } from 'grammy'
import type { FoodGroup } from '../types.js'
import { formatGroupListRow } from './formatters.js'

export const CB = {
  MENU_MAIN:      'menu:main',
  MENU_NEW:       'menu:new',
  MENU_LIST:      'menu:list',
  MENU_SUBSCRIBE: 'menu:subscribe',
  MENU_FEEDBACK:  'menu:feedback',
  MENU_HELP:      'menu:help',
  LIST_REFRESH:   'list:refresh',
  SUB_TOGGLE:     'subscribe:toggle',
  groupView:   (code: string) => `group:view:${code}`,
  groupJoin:   (code: string) => `group:join:${code}`,
  groupShare:  (code: string) => `group:share:${code}`,
  groupCancel: (code: string) => `group:cancel:${code}`,
  groupLeave:  (code: string) => `group:leave:${code}`,
} as const

export function mainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🍱 Browse Groups', CB.MENU_LIST).text('➕ New Group', CB.MENU_NEW).row()
    .text('🔔 Subscribe', CB.MENU_SUBSCRIBE).text('📣 Feedback', CB.MENU_FEEDBACK).row()
    .text('❓ Help', CB.MENU_HELP)
}

export function backToMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('🏠 Main Menu', CB.MENU_MAIN)
}

export function backToListKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('◀ Back to Groups', CB.MENU_LIST)
    .text('🏠 Main Menu', CB.MENU_MAIN)
}

export function groupListKeyboard(groups: FoodGroup[]): InlineKeyboard {
  const kb = new InlineKeyboard()
  for (const g of groups) {
    kb.text(formatGroupListRow(g), CB.groupView(g.code)).row()
  }
  kb.text('🔄 Refresh', CB.LIST_REFRESH).text('🏠 Main Menu', CB.MENU_MAIN)
  return kb
}

export function nonMemberCardKeyboard(code: string, isFull: boolean): InlineKeyboard {
  const kb = new InlineKeyboard()
  kb.text(isFull ? 'Full 🔴' : 'Join 🟢', CB.groupJoin(code))
  kb.text('Share 📤', CB.groupShare(code))
  kb.text('◀ Back', CB.MENU_LIST)
  return kb
}

export function memberCardKeyboard(code: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('Leave 🚪', CB.groupLeave(code))
    .text('Share 📤', CB.groupShare(code))
    .text('◀ Back', CB.MENU_LIST)
}

export function leaderCardKeyboard(code: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('Cancel Group ❌', CB.groupCancel(code))
    .text('Share 📤', CB.groupShare(code))
    .text('◀ Back', CB.MENU_LIST)
}

export function subscribeKeyboard(subscribed: boolean): InlineKeyboard {
  const label = subscribed ? '🔕 Turn Off' : '🔔 Turn On'
  return new InlineKeyboard()
    .text(label, CB.SUB_TOGGLE)
    .text('🏠 Main Menu', CB.MENU_MAIN)
}

export function maxMembersKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('2', 'new:max:2').text('3', 'new:max:3').text('4', 'new:max:4')
    .text('5', 'new:max:5').text('6', 'new:max:6').text('Custom 🔢', 'new:max:custom')
}

export function expiryKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('30 min', 'new:expiry:30').text('1 hour', 'new:expiry:60')
    .text('2 hours', 'new:expiry:120').text('Custom ⏰', 'new:expiry:custom')
}

export function confirmKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ Confirm', 'new:confirm')
    .text('❌ Start Over', 'new:restart')
}
