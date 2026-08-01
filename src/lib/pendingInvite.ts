/**
 * @fileoverview Stashes a group invite code captured from the Mini App's
 * `tgWebAppStartParam` launch param at boot, so it can be consumed once the
 * app has mounted and looked up (deep-link "open link -> see group -> join").
 */

let pendingCode: string | null = null;

/**
 * Stores the invite code to be consumed after mount.
 *
 * @param code - Uppercase group invite code, or `null` to clear.
 */
export function setPendingInviteCode(code: string | null): void {
  pendingCode = code;
}

/**
 * Reads and clears the pending invite code. Returns `null` if none was set
 * or it was already consumed.
 *
 * @returns The pending invite code, or `null`.
 */
export function consumePendingInviteCode(): string | null {
  const code = pendingCode;
  pendingCode = null;
  return code;
}
