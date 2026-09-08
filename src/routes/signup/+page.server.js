import { fail, redirect } from '@sveltejs/kit';
import { createUser } from '$lib/server/db.js';
import { hashPassword, createSession, setSessionCookie } from '$lib/server/auth.js';
import { safeRedirect } from '$lib/server/redirect-target.js';

const MIN_PASSWORD = 10;

export const actions = {
  default: async ({ request, cookies, platform, url }) => {
    const d1 = platform.env.DB;
    const form = await request.formData();
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const password = String(form.get('password') ?? '');
    const confirm = String(form.get('confirm') ?? '');

    // Only the non-secret fields are echoed back into the re-rendered form
    const echo = { name, email };

    if (!name) return fail(400, { ...echo, message: 'Name is required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, { ...echo, message: 'Enter a valid email address.' });
    if (password.length < MIN_PASSWORD)
      return fail(400, { ...echo, message: `Password must be at least ${MIN_PASSWORD} characters.` });
    if (password !== confirm) return fail(400, { ...echo, message: 'Passwords do not match.' });

    let user;
    try {
      user = await createUser(d1, { email, name, passwordHash: await hashPassword(password) });
    } catch (e) {
      // Racing signups hit the unique index rather than the pre-check, so catch it here
      if (String(e.message).includes('UNIQUE')) return fail(409, { ...echo, message: 'That email is already registered.' });
      throw e;
    }

    const { token, expiresAt } = await createSession(d1, user.id);
    setSessionCookie(cookies, token, expiresAt);
    throw redirect(303, safeRedirect(url.searchParams.get('redirectTo')));
  }
};
