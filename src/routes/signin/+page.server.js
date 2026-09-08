import { fail, redirect } from '@sveltejs/kit';
import { getUserByEmail } from '$lib/server/db.js';
import { verifyPassword, fakeVerify, createSession, setSessionCookie } from '$lib/server/auth.js';
import { safeRedirect } from '$lib/server/redirect-target.js';

export const actions = {
  default: async ({ request, cookies, platform, url }) => {
    const d1 = platform.env.DB;
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const password = String(form.get('password') ?? '');

    // `email` is echoed back so the field survives a failed attempt; `password` never is
    if (!email || !password) return fail(400, { email, message: 'Email and password are required.' });

    const user = await getUserByEmail(d1, email);
    // Same message and same PBKDF2 cost either way — a wrong password and an unknown
    // account are indistinguishable from the outside.
    const ok = user ? await verifyPassword(password, user.passwordHash) : await fakeVerify(password);
    if (!ok) return fail(401, { email, message: 'Email or password is incorrect.' });

    const { token, expiresAt } = await createSession(d1, user.id);
    setSessionCookie(cookies, token, expiresAt);
    throw redirect(303, safeRedirect(url.searchParams.get('redirectTo')));
  }
};
