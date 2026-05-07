/**
 * @fileoverview Telegram WebApp initData authentication utilities.
 * Uses Web Crypto API (HMAC-SHA256) — compatible with Vercel's Node.js runtime.
 */

/** Shape of the Telegram user embedded in initData. */
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

const enc = new TextEncoder();

/**
 * Imports raw bytes as an HMAC-SHA256 CryptoKey.
 *
 * @param keyMaterial - Raw bytes to use as the HMAC secret.
 * @returns A CryptoKey suitable for HMAC-SHA256 signing.
 */
function importRawKey(keyMaterial: BufferSource): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

/**
 * Computes HMAC-SHA256 and returns raw ArrayBuffer output.
 *
 * @param keyMaterial - Raw bytes for the HMAC key.
 * @param message - Message string to sign.
 * @returns Raw HMAC-SHA256 bytes.
 */
async function hmacBytes(keyMaterial: BufferSource, message: string): Promise<ArrayBuffer> {
  const key = await importRawKey(keyMaterial);
  return crypto.subtle.sign('HMAC', key, enc.encode(message));
}

/**
 * Computes HMAC-SHA256 and returns a lowercase hex string.
 *
 * @param keyMaterial - Raw bytes for the HMAC key.
 * @param message - Message string to sign.
 * @returns Hex-encoded HMAC-SHA256 digest.
 */
async function hmacHex(keyMaterial: BufferSource, message: string): Promise<string> {
  const buf = await hmacBytes(keyMaterial, message);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Builds the data-check string per Telegram's spec.
 * Excludes the `hash` field and sorts remaining entries alphabetically.
 *
 * @param params - URLSearchParams parsed from raw initData.
 * @returns Newline-joined sorted `key=value` pairs.
 */
function buildDataCheckString(params: URLSearchParams): string {
  return [...params.entries()]
    .filter(([k]) => k !== 'hash')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
}

/**
 * Validates Telegram WebApp initData using HMAC-SHA256 per Telegram's spec.
 *
 * Algorithm:
 *   secret_key = HMAC_SHA256(key="WebAppData", data=bot_token)
 *   expected   = HMAC_SHA256(key=secret_key,   data=data_check_string)
 *
 * @param rawInitData - The raw `initData` string from `Telegram.WebApp.initData`.
 * @param botToken - The Telegram bot token used to derive the secret key.
 * @returns The parsed `TelegramUser` extracted from the validated payload.
 * @throws {Error} If initData is missing, malformed, or the hash does not match.
 */
export async function validateInitData(
  rawInitData: string,
  botToken: string,
): Promise<TelegramUser> {
  if (!rawInitData) throw new Error('Missing initData');

  const params = new URLSearchParams(rawInitData);
  const receivedHash = params.get('hash');
  if (!receivedHash) throw new Error('Missing hash in initData');

  const secretKey = await hmacBytes(enc.encode('WebAppData'), botToken);
  const expectedHash = await hmacHex(secretKey, buildDataCheckString(params));

  if (expectedHash !== receivedHash) throw new Error('Invalid initData hash');

  const userJson = params.get('user');
  if (!userJson) throw new Error('Missing user in initData');

  return JSON.parse(userJson) as TelegramUser;
}
