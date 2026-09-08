// Password hashing + server-side sessions, built only on Web Crypto so it runs
// unchanged on Cloudflare Workers (no native bcrypt/argon2 addon is loadable there).

export const SESSION_COOKIE = 'trellos_session';
const SESSION_DAYS = 30;

// PBKDF2-HMAC-SHA256. OWASP's current floor for this KDF is 600k iterations; we run
// 100k because Workers bills the derivation against the request's CPU budget and a
// sign-in has to fit inside it. The count is stored per-hash, so raising it later only
// costs a re-hash on next sign-in, not a migration.
const ITERATIONS = 100_000;
const KEY_BITS = 256;

const enc = new TextEncoder();

function b64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}
function unb64(s) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, KEY_BITS);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await derive(password, salt, ITERATIONS);
  return `pbkdf2$sha256$${ITERATIONS}$${b64(salt)}$${b64(bits)}`;
}

// Constant-time compare so a wrong password can't be narrowed byte-by-byte via timing
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 5 || parts[0] !== 'pbkdf2' || parts[1] !== 'sha256') return false;
  const iterations = Number(parts[2]);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;
  const bits = await derive(password, unb64(parts[3]), iterations);
  return timingSafeEqual(new Uint8Array(bits), unb64(parts[4]));
}

// The session id in the database is a digest of the cookie value, so the cookie is the
// only place the raw token ever exists.
async function tokenDigest(token) {
  return b64(await crypto.subtle.digest('SHA-256', enc.encode(token)));
}

export async function createSession(d1, userId) {
  const token = b64(crypto.getRandomValues(new Uint8Array(32)));
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  await d1
    .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(await tokenDigest(token), userId, expiresAt)
    .run();
  return { token, expiresAt };
}

// Returns the signed-in user, or null if the token is unknown/expired. Expired rows are
// deleted on sight so the table self-cleans without a cron job.
export async function resolveSession(d1, token) {
  if (!token) return null;
  const id = await tokenDigest(token);
  const row = await d1
    .prepare(
      `SELECT s.expires_at AS expiresAt, u.id, u.email, u.name
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`
    )
    .bind(id)
    .first();
  if (!row) return null;
  if (Date.parse(row.expiresAt) <= Date.now()) {
    await d1.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run();
    return null;
  }
  return { id: row.id, email: row.email, name: row.name };
}

export async function destroySession(d1, token) {
  if (!token) return;
  await d1.prepare('DELETE FROM sessions WHERE id = ?').bind(await tokenDigest(token)).run();
}

export function setSessionCookie(cookies, token, expiresAt) {
  cookies.set(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    // `secure` intentionally omitted: SvelteKit defaults it to true except on
    // http://localhost, which is what `wrangler dev` serves.
    expires: new Date(expiresAt)
  });
}

export function clearSessionCookie(cookies) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

// Burn the same PBKDF2 work when no account matches the submitted email, so that
// response time doesn't disclose which addresses are registered. The throwaway hash is
// cached per isolate; its plaintext is random and never used again.
let dummyHash;
export async function fakeVerify(password) {
  dummyHash ??= await hashPassword(crypto.randomUUID());
  return verifyPassword(password, dummyHash);
}
