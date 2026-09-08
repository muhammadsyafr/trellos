<script>
  import { enhance } from '$app/forms';
  import AuthCard from '$lib/AuthCard.svelte';

  let { form } = $props();
  let submitting = $state(false);
</script>

<svelte:head><title>Sign in · Trellos</title></svelte:head>

<AuthCard title="Sign in" subtitle="Pick up where you left off." error={form?.message}>
  <form
    method="POST"
    use:enhance={() => {
      submitting = true;
      return async ({ update }) => {
        await update({ reset: false });
        submitting = false;
      };
    }}
  >
    <label>
      Email
      <input name="email" type="email" autocomplete="email" required value={form?.email ?? ''} />
    </label>
    <label>
      Password
      <input name="password" type="password" autocomplete="current-password" required />
    </label>
    <button type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
  </form>

  {#snippet footer()}
    New here? <a href="/signup">Create an account</a>
  {/snippet}
</AuthCard>
