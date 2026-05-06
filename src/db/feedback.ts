import { query } from './connection.js'

/**
 * Inserts a feedback message into the database.
 *
 * This function stores user feedback with an associated user ID and message text.
 * The feedback is inserted into the `feedback` table and linked to the user via
 * the `user_id` field. This allows developers to track and review user-submitted
 * feedback for bugs, suggestions, or general comments.
 *
 * @param userId - The unique identifier of the user submitting the feedback.
 * @param message - The feedback message text. Should be validated for length and
 *   content before calling this function.
 * @returns A promise that resolves when the feedback has been successfully
 *   inserted into the database.
 * @throws Will throw an error if the database query fails (e.g., due to connection
 *   issues or constraint violations).
 *
 * @example
 * // Insert feedback from user with ID 12345
 * await insertFeedback(12345, 'Found a bug in the login flow');
 */
export async function insertFeedback(userId: number, message: string): Promise<void> {
  await query(
    'INSERT INTO feedback (user_id, message) VALUES ($1, $2)',
    [userId, message]
  )
}
