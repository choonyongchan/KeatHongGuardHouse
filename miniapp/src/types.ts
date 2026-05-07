/**
 * @fileoverview Shared TypeScript interfaces for the KeatHong MiniApp.
 * These mirror the bot's data model exactly.
 */

/** Status values a food group can have throughout its lifecycle. */
export type GroupStatus = 'open' | 'full' | 'expired' | 'cancelled';

/** A food group as returned by the API. */
export interface FoodGroup {
  id: number;
  code: string;
  creator_id: number;
  creator_first_name: string;
  creator_username: string | null;
  title: string;
  external_link: string;
  max_members: number;
  current_count: number;
  expires_at: string;
  status: GroupStatus;
  expiry_warned: boolean;
  created_at: string;
}

/** A group member as returned inside a group detail response. */
export interface GroupMember {
  group_id: number;
  user_id: number;
  first_name: string;
  username: string | null;
  joined_at: string;
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
