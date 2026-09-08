<script>
  // Design tokens live here rather than in the board page so /signin and /signup —
  // which never mount that page — get the same palette.
  import '../app.css';

  let { children } = $props();
</script>

{@render children()}
