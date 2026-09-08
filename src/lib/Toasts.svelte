<script>
  import { toasts, dismissToast } from './toasts.svelte.js';
</script>

<!-- aria-live so screen readers announce the message the same way an alert() would -->
<div class="stack" role="region" aria-label="Notifications">
  {#each toasts as t (t.id)}
    <div class="toast {t.tone}" role={t.tone === 'error' ? 'alert' : 'status'}>
      <span class="msg">{t.message}</span>
      <button class="close" onclick={() => dismissToast(t.id)} aria-label="Dismiss">✕</button>
    </div>
  {/each}
</div>

<style>
  .stack {
    position: fixed; bottom: 16px; right: 16px; z-index: 80;
    display: flex; flex-direction: column; gap: 8px;
    /* the container spans the corner but must not eat clicks on the board behind it */
    pointer-events: none;
  }
  .toast {
    pointer-events: auto;
    display: flex; align-items: flex-start; gap: 10px;
    min-width: 240px; max-width: min(380px, calc(100vw - 32px));
    padding: 11px 12px; border-radius: var(--r-md);
    background: var(--surface); border: 1px solid var(--border);
    box-shadow: var(--shadow-pop);
    font-size: 14px; line-height: 20px; color: var(--on-surface);
    animation: slide-in 140ms ease-out;
  }
  .toast.error { border-left: 3px solid var(--error); }
  .toast.success { border-left: 3px solid #00875A; }
  .toast.info { border-left: 3px solid var(--primary); }

  .msg { flex: 1; word-break: break-word; }
  .close {
    flex-shrink: 0; font: inherit; font-size: 12px; line-height: 1; cursor: pointer;
    color: var(--muted); background: none; border: 0; padding: 4px; border-radius: var(--r-sm);
  }
  .close:hover { color: var(--secondary); background: var(--hover-tint); }

  @keyframes slide-in {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .toast { animation: none; }
  }
</style>
