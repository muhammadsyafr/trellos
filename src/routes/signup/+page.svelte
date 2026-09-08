<script>
  import { enhance } from '$app/forms';
  import AuthCard from '$lib/AuthCard.svelte';

  let { form } = $props();
  let submitting = $state(false);
</script>

<svelte:head><title>Create account · Trellos</title></svelte:head>

<AuthCard title="Create your account" subtitle="Your boards, cards and history — private to you." error={form?.message}>
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
      Name
      <input name="name" type="text" autocomplete="name" required value={form?.name ?? ''} />
    </label>
    <label>
      Email
      <input name="email" type="email" autocomplete="email" required value={form?.email ?? ''} />
    </label>
    <label>
      Password
      <input name="password" type="password" autocomplete="new-password" minlength="10" required />
      <span class="hint">At least 10 characters.</span>
    </label>
    <label>
      Confirm password
      <input name="confirm" type="password" autocomplete="new-password" minlength="10" required />
    </label>
    <button type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account'}</button>
  </form>

  {#snippet footer()}
    Already have an account? <a href="/signin">Sign in</a>
  {/snippet}
</AuthCard>
