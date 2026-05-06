import type { Context, SessionFlavor } from 'grammy'
import type { ConversationFlavor } from '@grammyjs/conversations'

export interface User {
  telegramId: number
  username: string | null
  firstName: string
  subscribed: boolean
  createdAt: Date
}

export interface FoodGroup {
  id: number
  code: string
  creatorId: number
  title: string
  externalLink: string
  maxMembers: number
  currentCount: number
  expiresAt: Date
  status: 'open' | 'full' | 'expired' | 'cancelled'
  expiryWarned: boolean
  createdAt: Date
}

export interface GroupMember {
  groupId: number
  userId: number
  username: string | null
  firstName: string
  joinedAt: Date
}

export type Result<T> =
  | { ok: true;  data: T }
  | { ok: false; error: string }

export const ok  = <T>(data: T): Result<T>      => ({ ok: true,  data })
export const err = (error: string): Result<never> => ({ ok: false, error })

interface SessionData {}
type BaseContext           = Context & SessionFlavor<SessionData>
export type MyContext      = ConversationFlavor<BaseContext>
export type MyConversation = import('@grammyjs/conversations').Conversation<MyContext, MyContext>
