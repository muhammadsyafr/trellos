import { redirect, json } from '@sveltejs/kit';
import { SESSION_COOKIE, resolveSession } from '$lib/server/auth.js';

// Routes reachable without a session. Everything else — pages and API alike — is gated.
const PUBLIC_PATHS = new Set(['/signin', '/signup']);

export async function handle({ event, resolve }) {
  const d1 = event.platform?.env?.DB;
  const token = event.cookies.get(SESSION_COOKIE);
  event.locals.user = d1 ? await resolveSession(d1, token) : null;

  const { pathname } = event.url;

  if (!event.locals.user && !PUBLIC_PATHS.has(pathname)) {
    // A fetch() from the board UI wants a status it can branch on, not an HTML sign-in page
    if (pathname.startsWith('/api/')) return json({ message: 'not signed in' }, { status: 401 });
    const target = pathname + event.url.search;
    throw redirect(303, `/signin?redirectTo=${encodeURIComponent(target)}`);
  }

  // Already signed in? The auth pages have nothing to offer.
  if (event.locals.user && PUBLIC_PATHS.has(pathname)) throw redirect(303, '/');

  return resolve(event);
}
