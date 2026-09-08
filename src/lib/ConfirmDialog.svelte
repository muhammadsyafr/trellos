<script>
  // Replacement for window.confirm(): themeable, and unlike the native dialog it doesn't
  // block the event loop or get suppressed by "prevent this page from creating more dialogs".
  let {
    title,
    message,
    highlight = null,
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    onconfirm,
    oncancel
  } = $props();

  let dialogEl = $state(null);
  let cancelEl = $state(null);

  // Focus the non-destructive button, so a stray Enter cancels rather than deletes
  $effect(() => {
    const opener = document.activeElement;
    cancelEl?.focus();
    return () => opener instanceof HTMLElement && opener.focus();
  });

  // Keep Tab inside the dialog — without this, focus walks the board behind the overlay
  function trap(e) {
    if (e.key !== 'Tab' || !dialogEl) return;
    const focusable = dialogEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div class="overlay" onclick={(e) => e.target === e.currentTarget && oncancel()}>
  <div
    class="dialog"
    bind:this={dialogEl}
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="confirm-title"
    aria-describedby="confirm-body"
    onkeydown={trap}
  >
    <h2 id="confirm-title">{title}</h2>
    <p id="confirm-body">
      <!-- {' '} not a literal space: Svelte trims trailing whitespace inside the block -->
      {#if highlight}“<strong>{highlight}</strong>”{' '}{/if}{message}
    </p>
    <div class="actions">
      <button class="btn-secondary" bind:this={cancelEl} onclick={oncancel}>{cancelLabel}</button>
      <button class="btn-danger" onclick={onconfirm}>{confirmLabel}</button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed; inset: 0; z-index: 60;
    display: flex; align-items: center; justify-content: center; padding: 6vh 16px;
    background: var(--overlay);
  }
  .dialog {
    background: var(--surface); border-radius: var(--r-lg); width: 100%; max-width: 420px;
    padding: 24px; box-shadow: var(--shadow-pop); display: flex; flex-direction: column; gap: 8px;
  }
  h2 { margin: 0; font-size: 20px; font-weight: 500; color: var(--secondary); }
  p { margin: 0; font-size: 14px; line-height: 20px; color: var(--on-surface); word-break: break-word; }
  strong { font-weight: 600; }
  .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }

  button { font: inherit; cursor: pointer; }
  .btn-secondary {
    background: var(--surface); color: var(--secondary); font-weight: 500;
    border: 1px solid var(--border); padding: 10px 16px; border-radius: var(--r-sm);
  }
  .btn-secondary:hover { background: var(--neutral); border-color: #B3BAC5; }
  .btn-danger {
    background: var(--surface); color: var(--error); font-weight: 500;
    border: 1px solid var(--border); padding: 10px 16px; border-radius: var(--r-sm);
  }
  .btn-danger:hover { background: var(--error); color: var(--surface); border-color: var(--error); }
  button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
</style>
