<script>
  // Chrome shared by /signin and /signup: centred card, product mark, error banner.
  let { title, subtitle, error = null, children, footer } = $props();
</script>

<main>
  <div class="card">
    <div class="brand">
      <span class="logo" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="3" width="7" height="14" rx="1.5" />
          <rect x="13" y="3" width="7" height="9" rx="1.5" />
        </svg>
      </span>
      <h1>Trell<span>os</span></h1>
    </div>

    <h2>{title}</h2>
    <p class="subtitle">{subtitle}</p>

    {#if error}
      <p class="error" role="alert">{error}</p>
    {/if}

    {@render children()}
  </div>

  <p class="footer">{@render footer()}</p>
</main>

<style>
  main {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 16px; padding: 24px; overflow: auto;
  }
  .card {
    width: 100%; max-width: 380px; padding: 28px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); box-shadow: var(--shadow-pop);
  }

  .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 22px; }
  .logo {
    display: grid; place-items: center; width: 32px; height: 32px; flex-shrink: 0;
    color: #fff; border-radius: 9px;
    background: linear-gradient(135deg, var(--primary-70), var(--primary));
    box-shadow: 0 2px 6px color-mix(in srgb, var(--primary) 40%, transparent);
  }
  .logo svg { width: 19px; height: 19px; }
  h1 { font-size: 20px; font-weight: 600; line-height: 1; color: var(--secondary); letter-spacing: -.02em; margin: 0; }
  h1 span { color: var(--primary); }

  h2 { font-size: 24px; font-weight: 600; line-height: 1.2; color: var(--secondary); margin: 0 0 6px; }
  .subtitle { font-size: 14px; line-height: 20px; color: var(--muted); margin: 0 0 20px; }

  .error {
    display: flex; gap: 8px; margin: 0 0 18px; padding: 10px 12px;
    font-size: 13px; line-height: 18px; border-radius: var(--r-md);
    color: var(--error); background: color-mix(in srgb, var(--error) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--error) 32%, transparent);
  }

  .footer { font-size: 13px; color: var(--muted); margin: 0; }
  .footer :global(a) { color: var(--primary); font-weight: 500; text-decoration: none; }
  .footer :global(a:hover) { text-decoration: underline; }

  /* Shared form furniture — the pages render the actual fields */
  .card :global(form) { display: flex; flex-direction: column; gap: 14px; }
  .card :global(label) {
    display: flex; flex-direction: column; gap: 6px;
    font-size: 12px; font-weight: 500; color: var(--secondary);
  }
  .card :global(input) {
    font: inherit; font-size: 14px; padding: 9px 11px;
    color: var(--on-surface); background: var(--neutral);
    border: 1px solid var(--border); border-radius: var(--r-md);
  }
  .card :global(input:focus) {
    outline: none; background: var(--surface);
    border-color: var(--primary-60); box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 25%, transparent);
  }
  .card :global(.hint) { font-size: 12px; font-weight: 400; color: var(--muted); }
  .card :global(button[type='submit']) {
    margin-top: 6px; padding: 10px 14px; font: inherit; font-size: 14px; font-weight: 600;
    color: #fff; background: var(--primary); border: 0; border-radius: var(--r-md); cursor: pointer;
  }
  .card :global(button[type='submit']:hover) { background: var(--primary-80); }
  .card :global(button[type='submit']:disabled) { opacity: .6; cursor: progress; }
</style>
