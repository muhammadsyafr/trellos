// Replacement for window.alert(): a non-blocking notification stack. Shared module state
// so any component can raise one without threading callbacks through the tree.

let seq = 0;
export const toasts = $state([]);

// tone: 'error' | 'success' | 'info'. Errors stay longer — they usually need reading twice.
export function pushToast(message, tone = 'error', ttl = tone === 'error' ? 7000 : 4000) {
  const id = ++seq;
  toasts.push({ id, message, tone });
  setTimeout(() => dismissToast(id), ttl);
  return id;
}

export function dismissToast(id) {
  const i = toasts.findIndex((t) => t.id === id);
  if (i !== -1) toasts.splice(i, 1);
}
