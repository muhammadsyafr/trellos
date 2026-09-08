// Only same-origin, single-slash paths survive: a bare `?redirectTo=` value is
// attacker-controlled, and "//evil.example" or "https://evil.example" would otherwise
// turn the sign-in form into an open redirect.
export function safeRedirect(target, fallback = '/') {
  if (typeof target !== 'string') return fallback;
  if (!target.startsWith('/') || target.startsWith('//')) return fallback;
  return target;
}
