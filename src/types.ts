/**
 * @fileoverview Shared TypeScript interfaces for the KeatHong MiniApp.
 * These mirror the bot's data model exactly.
 */

/** Status values a food group can have throughout its lifecycle. */
export type GroupStatus = 'open' | 'full' | 'expired' | 'cancelled';

/** Whether a group is listed in Browse ('public') or code/link-only ('private'). */
export type GroupVisibility = 'public' | 'private';

/** A food group as returned by the API. */
export interface FoodGroup {
  id: number;
  code: string;
  creatorId: number;
  creatorFirstName: string;
  creatorUsername: string | null;
  title: string;
  externalLink: string;
  maxMembers: number | null;
  currentCount: number;
  expiresAt: string;
  status: GroupStatus;
  visibility: GroupVisibility;
  expiryWarned: boolean;
  createdAt: string;
}

/** A group member as returned inside a group detail response. */
export interface GroupMember {
  groupId: number;
  userId: number;
  firstName: string;
  username: string | null;
  joinedAt: string;
}

/** A food group with its full member list attached. */
export interface FoodGroupDetail extends FoodGroup {
  members: GroupMember[];
}

/** The authenticated user's profile returned by GET /api/users/me. */
export interface UserProfile {
  id: number;
  firstName: string;
  username: string | null;
  subscribed: boolean;
  createdGroups: FoodGroup[];
  joinedGroups: FoodGroup[];
}
