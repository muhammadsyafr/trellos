<script>
  import { dndzone } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import { onMount } from 'svelte';

  let { data } = $props();
  let columns = $state(data.board);

  // card density: comfortable (default) | compact, persisted locally
  let compact = $state(false);
  onMount(() => { compact = localStorage.getItem('trellos.compact') === '1'; });
  function toggleCompact() {
    compact = !compact;
    localStorage.setItem('trellos.compact', compact ? '1' : '0');
  }

  // light | dark theme, persisted; applied as data-theme on <html>
  let dark = $state(false);
  function applyTheme() { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; }
  function toggleTheme() {
    dark = !dark;
    localStorage.setItem('trellos.theme', dark ? 'dark' : 'light');
    applyTheme();
  }
  onMount(() => { dark = localStorage.getItem('trellos.theme') === 'dark'; applyTheme(); });

  // vivid priority colors for the compact left bar / dot
  const PR_COLOR = { Low: '#36B37E', Medium: '#2684FF', High: '#FF991F', Urgent: '#DE350B' };
  const prColor = (p) => PR_COLOR[p] ?? 'var(--muted)';

  const FLIP = 160;
  const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

  // light label tints; color picked deterministically from the tag name
  const TAG_COLORS = [
    { bg: '#E3FCEF', fg: '#006644' },
    { bg: '#DEEBFF', fg: '#0052CC' },
    { bg: '#EAE6FF', fg: '#403294' },
    { bg: '#E6FCFF', fg: '#206A83' },
    { bg: '#FFF0B3', fg: '#974F0C' },
    { bg: '#FFEBE6', fg: '#DE350B' },
    { bg: '#FFECF1', fg: '#943D73' },
    { bg: '#EBECF0', fg: '#42526E' }
  ];
  function tagColor(t) {
    let h = 0;
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
    return TAG_COLORS[h % TAG_COLORS.length];
  }

  let addingTo = $state(null);
  let draftText = $state('');
  let tagDraft = $state('');

  // detail modal
  let open = $state(null); // { colId, card } reference into state
  const openCard = $derived(open?.card ?? null);

  // delete confirmation
  let confirmDel = $state(null); // { col, card }

  const totalCards = $derived(columns.reduce((n, c) => n + c.cards.length, 0));

  // ---- API helpers ----
  const post = (url, body) =>
    fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());
  const patch = (url, body) =>
    fetch(url, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const del = (url) => fetch(url, { method: 'DELETE' });

  function focus(node) {
    node.focus();
    if (node.setSelectionRange) node.setSelectionRange(node.value.length, node.value.length);
  }

  function persistOrder() {
    const payload = columns.map((c) => ({ id: c.id, cardIds: c.cards.map((card) => card.id) }));
    post('/api/reorder', { columns: payload });
  }

  // ---- drag ----
  const handleConsider = (ci, e) => (columns[ci].cards = e.detail.items);
  function handleFinalize(ci, e) {
    columns[ci].cards = e.detail.items;
    persistOrder();
  }

  // ---- columns ----
  async function addColumn() {
    columns.push(await post('/api/columns', { title: 'New List' }));
  }
  function renameColumn(col, value) {
    col.title = value.trim() || 'Untitled';
    patch(`/api/columns/${col.id}`, { title: col.title });
  }
  function deleteColumn(col) {
    if (col.cards.length && !confirm(`Delete "${col.title}" and its ${col.cards.length} cards?`)) return;
    columns = columns.filter((c) => c.id !== col.id);
    del(`/api/columns/${col.id}`);
  }

  // ---- cards ----
  function startAdd(colId) { addingTo = colId; draftText = ''; }
  async function commitAdd(col) {
    const text = draftText.trim();
    if (text) col.cards.push(await post('/api/cards', { columnId: col.id, text }));
    draftText = '';
  }
  function askDelete(col, card) { confirmDel = { col, card }; }
  function cancelDelete() { confirmDel = null; }
  function confirmDelete() {
    const { col, card } = confirmDel;
    col.cards = col.cards.filter((c) => c.id !== card.id);
    del(`/api/cards/${card.id}`);
    if (open?.card.id === card.id) open = null;
    confirmDel = null;
  }

  // ---- detail modal ----
  function openDetail(col, card) { open = { colId: col.id, card }; tagDraft = ''; }
  function closeDetail() { open = null; }

  // field edits patch immediately and mutate the live state object
  function saveField(field, value) {
    const card = open.card;
    if (field === 'text' && !value.trim()) return;
    card[field] = field === 'text' ? value.trim() : value;
    patch(`/api/cards/${card.id}`, { [field]: card[field] });
  }
  function addTag() {
    const v = tagDraft.trim();
    if (!v) return;
    const card = open.card;
    if (!card.tags.includes(v)) {
      card.tags = [...card.tags, v];
      patch(`/api/cards/${card.id}`, { tags: card.tags });
    }
    tagDraft = '';
  }
  function removeTag(t) {
    const card = open.card;
    card.tags = card.tags.filter((x) => x !== t);
    patch(`/api/cards/${card.id}`, { tags: card.tags });
  }
  function changeStatus(targetColId) {
    targetColId = Number(targetColId);
    if (targetColId === open.colId) return;
    const from = columns.find((c) => c.id === open.colId);
    const to = columns.find((c) => c.id === targetColId);
    const card = open.card;
    from.cards = from.cards.filter((c) => c.id !== card.id);
    to.cards.push(card);
    open.colId = targetColId;
    patch(`/api/cards/${card.id}`, { columnId: targetColId });
  }
  function deleteFromModal() {
    const col = columns.find((c) => c.id === open.colId);
    askDelete(col, open.card);
  }

  const prClass = (p) => 'pr-' + p.toLowerCase();
  function colTitleOf(card) {
    return columns.find((c) => c.cards.some((x) => x.id === card.id))?.title ?? '';
  }
</script>

<svelte:head><title>Trellos</title></svelte:head>

<header>
  <div class="brand">
    <span class="logo" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="7" height="16" rx="2" fill="currentColor" />
        <rect x="13" y="4" width="7" height="10" rx="2" fill="currentColor" opacity=".55" />
      </svg>
    </span>
    <h1>Trel<span>los</span></h1>
    <span class="stat"><b>{columns.length}</b> lists<i></i><b>{totalCards}</b> cards</span>
  </div>

  <div class="spacer"></div>

  <div class="actions">
    <button class="density" title={dark ? 'Switch to light mode' : 'Switch to dark mode'} aria-label="Toggle theme" onclick={toggleTheme}>
      {#if dark}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      {:else}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      {/if}
    </button>
    <span class="sep" aria-hidden="true"></span>
    <button class="density" title={compact ? 'Compact view — click for comfortable' : 'Comfortable view — click for compact'} aria-label="Toggle card density" onclick={toggleCompact}>
      {#if compact}
        <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <rect x="2" y="3" width="12" height="1.8" rx=".9" />
          <rect x="2" y="7.1" width="12" height="1.8" rx=".9" />
          <rect x="2" y="11.2" width="12" height="1.8" rx=".9" />
        </svg>
      {:else}
        <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <rect x="2" y="2.5" width="12" height="5" rx="1.2" />
          <rect x="2" y="8.5" width="12" height="5" rx="1.2" />
        </svg>
      {/if}
    </button>
  </div>
</header>

<div class="board" class:compact>
  {#each columns as col, ci (col.id)}
    <div class="column">
      <div class="col-head">
        <input
          class="col-title"
          value={col.title}
          onblur={(e) => renameColumn(col, e.target.value)}
          onkeydown={(e) => e.key === 'Enter' && e.target.blur()}
        />
        <span class="col-count">{col.cards.length}</span>
        <button class="icon-btn danger" title="Delete list" onclick={() => deleteColumn(col)}>✕</button>
      </div>

      <div
        class="cards"
        use:dndzone={{ items: col.cards, flipDurationMs: FLIP, dropTargetStyle: {}, dropTargetClasses: ['drag-over'] }}
        onconsider={(e) => handleConsider(ci, e)}
        onfinalize={(e) => handleFinalize(ci, e)}
      >
        {#each col.cards as card (card.id)}
          <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
          <div class="card" class:compact style="--pr-color:{prColor(card.priority)}" animate:flip={{ duration: FLIP }} onclick={() => openDetail(col, card)}>
            {#if card.tags?.length}
              <div class="card-tags">
                {#each card.tags as t}
                  <span class="tag" style="background:{tagColor(t).bg};color:{tagColor(t).fg}">{t}</span>
                {/each}
              </div>
            {/if}
            <span class="card-text">{card.text}</span>
            <div class="card-foot">
              <span class="badge {prClass(card.priority)}">{card.priority}</span>
              {#if card.description}<span class="has-desc" title="Has description">≡</span>{/if}
            </div>
            <button class="del" title="Delete card" onclick={(e) => { e.stopPropagation(); askDelete(col, card); }}>✕</button>
          </div>
        {/each}
      </div>

      {#if addingTo === col.id}
        <div class="add-form">
          <textarea
            placeholder="Card title… (Enter to add, Esc to cancel)"
            bind:value={draftText}
            use:focus
            onkeydown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitAdd(col); }
              if (e.key === 'Escape') addingTo = null;
            }}
          ></textarea>
          <div class="row">
            <button class="btn-primary" onclick={() => commitAdd(col)}>Add</button>
            <button class="icon-btn" onclick={() => (addingTo = null)}>Cancel</button>
          </div>
        </div>
      {:else}
        <button class="add-card" onclick={() => startAdd(col.id)}>+ Add a card</button>
      {/if}
    </div>
  {/each}

  <button class="add-column" onclick={addColumn}>+ Add another list</button>
</div>

<svelte:window onkeydown={(e) => {
  if (e.key !== 'Escape') return;
  if (confirmDel) cancelDelete();
  else if (openCard) closeDetail();
}} />

{#if openCard}
  <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
  <div class="overlay" onclick={(e) => e.target === e.currentTarget && closeDetail()}>
    <div class="modal">
      <div class="modal-head">
        <span class="badge {prClass(openCard.priority)}">{openCard.priority}</span>
        <span class="modal-id">#{openCard.id}</span>
        <div class="spacer"></div>
        <button class="icon-btn" title="Close" onclick={closeDetail}>✕</button>
      </div>

      <textarea
        class="m-title"
        value={openCard.text}
        rows="1"
        onblur={(e) => saveField('text', e.target.value)}
      ></textarea>

      <div class="m-grid">
        <label>Status
          <select value={open.colId} onchange={(e) => changeStatus(e.target.value)}>
            {#each columns as c}<option value={c.id}>{c.title}</option>{/each}
          </select>
        </label>
        <label>Priority
          <select value={openCard.priority} onchange={(e) => saveField('priority', e.target.value)}>
            {#each PRIORITIES as p}<option value={p}>{p}</option>{/each}
          </select>
        </label>
      </div>

      <div class="m-tags-section">
        <span class="m-label">Tags</span>
        <div class="m-tags">
          {#each openCard.tags as t}
            <span class="tag removable" style="background:{tagColor(t).bg};color:{tagColor(t).fg}">
              {t}
              <button class="tag-x" title="Remove tag" onclick={() => removeTag(t)}>×</button>
            </span>
          {/each}
          <input
            class="tag-input"
            placeholder="Add tag…"
            bind:value={tagDraft}
            onkeydown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); addTag(); }
              if (e.key === 'Backspace' && !tagDraft && openCard.tags.length) removeTag(openCard.tags[openCard.tags.length - 1]);
            }}
            onblur={addTag}
          />
        </div>
      </div>

      <span class="m-label">Description</span>
      <textarea
        class="m-desc"
        placeholder="Add a more detailed description…"
        value={openCard.description}
        onblur={(e) => saveField('description', e.target.value)}
      ></textarea>

      <div class="modal-foot">
        <span class="created">Created {new Date(openCard.createdAt + 'Z').toLocaleString()}</span>
        <div class="spacer"></div>
        <button class="btn-danger" onclick={deleteFromModal}>Delete</button>
      </div>
    </div>
  </div>
{/if}

{#if confirmDel}
  <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
  <div class="overlay confirm-overlay" onclick={(e) => e.target === e.currentTarget && cancelDelete()}>
    <div class="confirm">
      <h2>Delete card?</h2>
      <p>“<strong>{confirmDel.card.text}</strong>” will be permanently removed. This can't be undone.</p>
      <div class="confirm-actions">
        <button class="btn-secondary" onclick={cancelDelete}>Cancel</button>
        <button class="btn-danger" onclick={confirmDelete}>Delete</button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Trello Calm Productivity — DESIGN.md tokens.
     Charlie Display/Text are proprietary; using a clean system stack to stay offline/local. */
  :global(:root) {
    --primary: #0052CC;
    --primary-60: #4C9AFF;
    --primary-70: #2684FF;
    --primary-80: #0065FF;
    --secondary: #172B4D;
    --tertiary: #6554C0;
    --neutral: #F4F5F7;
    --surface: #FFFFFF;
    --on-surface: #091E42;
    --error: #DE350B;
    --border: #DFE1E6;
    --muted: var(--muted);
    --hover-tint: rgba(9, 30, 66, .06);
    --overlay: rgba(9, 30, 66, .54);

    --r-sm: 4px; --r-md: 8px; --r-lg: 12px; --r-full: 9999px;
    --shadow-card: 0 1px 1px rgba(9,30,66,.10), 0 0 1px rgba(9,30,66,.12);
    --shadow-pop: 0 8px 24px rgba(9,30,66,.18);
    --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
  :global(html[data-theme='dark']) {
    --primary: #4C9AFF;
    --primary-60: #579DFF;
    --primary-70: #85B8FF;
    --primary-80: #85B8FF;
    --secondary: #C7D1DB;
    --tertiary: #9F8FEF;
    --neutral: #1D2125;
    --surface: #22272B;
    --on-surface: #C7D1DB;
    --error: #F87168;
    --border: #38414A;
    --muted: #8C9BAB;
    --hover-tint: rgba(255, 255, 255, .08);
    --overlay: rgba(0, 0, 0, .6);
    --shadow-card: 0 1px 2px rgba(0,0,0,.4);
    --shadow-pop: 0 8px 24px rgba(0,0,0,.5);
  }
  :global(body) {
    margin: 0; font-family: var(--font);
    background: var(--neutral); color: var(--on-surface);
    height: 100vh; display: flex; flex-direction: column; overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }

  header {
    position: sticky; top: 0; z-index: 20;
    display: flex; align-items: center; gap: 14px; padding: 10px 20px;
    background: color-mix(in srgb, var(--surface) 80%, transparent);
    -webkit-backdrop-filter: saturate(180%) blur(12px);
    backdrop-filter: saturate(180%) blur(12px);
    border-bottom: 1px solid var(--border);
  }

  .brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .logo {
    display: grid; place-items: center; width: 32px; height: 32px; flex-shrink: 0;
    color: #fff; border-radius: 9px;
    background: linear-gradient(135deg, var(--primary-70), var(--primary));
    box-shadow: 0 2px 6px color-mix(in srgb, var(--primary) 40%, transparent);
  }
  .logo svg { width: 19px; height: 19px; }

  h1 { font-size: 20px; font-weight: 600; line-height: 1; color: var(--secondary); letter-spacing: -.02em; margin: 0; }
  h1 span { color: var(--primary); }

  .stat {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 12px; line-height: 1; color: var(--muted);
    padding: 5px 10px; border-radius: var(--r-full); background: var(--hover-tint);
    white-space: nowrap;
  }
  .stat b { font-weight: 600; color: var(--secondary); }
  .stat i { width: 3px; height: 3px; border-radius: 50%; background: currentColor; opacity: .5; }

  .actions {
    display: flex; align-items: center; gap: 2px; padding: 3px;
    background: var(--neutral); border: 1px solid var(--border); border-radius: var(--r-full);
  }
  .actions .sep { width: 1px; align-self: stretch; margin: 4px 2px; background: var(--border); }

  .density {
    display: inline-flex; align-items: center; justify-content: center;
    color: var(--secondary); background: transparent;
    border: none; width: 32px; height: 32px; padding: 0; border-radius: var(--r-full);
    transition: background-color .14s ease, color .14s ease;
  }
  .density:hover { background: var(--surface); color: var(--primary); }
  .density svg { width: 17px; height: 17px; color: var(--primary); flex-shrink: 0; }
  .density[aria-label='Toggle card density'] svg { width: 15px; height: 15px; }

  @media (max-width: 640px) {
    header { padding: 10px 14px; gap: 10px; }
    .stat { display: none; }
  }

  button { font-family: inherit; cursor: pointer; border: none; background: transparent; color: var(--secondary); font-size: 14px; border-radius: var(--r-sm); }

  .btn-primary {
    background: var(--primary); color: var(--surface); font-weight: 500; font-size: 14px;
    line-height: 20px; padding: 10px 16px; border-radius: var(--r-sm);
  }
  .btn-primary:hover { background: var(--primary-80); }
  .btn-primary:active { background: #003E99; }

  .btn-danger {
    background: var(--surface); color: var(--error); font-weight: 500;
    border: 1px solid var(--border); padding: 10px 16px; border-radius: var(--r-sm);
  }
  .btn-danger:hover { background: var(--error); color: var(--surface); border-color: var(--error); }

  .icon-btn { color: var(--muted); padding: 6px 9px; border-radius: var(--r-sm); line-height: 1; }
  .icon-btn:hover { background: var(--neutral); color: var(--secondary); }
  .icon-btn.danger:hover { background: #FFEBE6; color: var(--error); }
  .spacer { flex: 1; }

  .board { flex: 1; display: flex; gap: 16px; padding: 24px; overflow-x: auto; align-items: flex-start; }

  /* mobile: board becomes a one-column-per-swipe carousel (CSS scroll-snap) */
  @media (max-width: 640px) {
    .board {
      padding: 16px;
      gap: 12px;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      scroll-padding: 16px;
    }
    .column {
      width: calc(100vw - 32px);
      max-width: 360px;
      scroll-snap-align: center;
      scroll-snap-stop: always;
    }
    .add-column { scroll-snap-align: center; }
  }

  .column {
    background: var(--neutral); border: 1px solid var(--border); border-radius: var(--r-lg);
    width: 288px; flex-shrink: 0; display: flex; flex-direction: column; max-height: 100%;
  }
  .col-head { display: flex; align-items: center; gap: 6px; padding: 12px 12px 8px; }
  .col-title {
    flex: 1; font-weight: 500; font-size: 14px; line-height: 20px; background: transparent;
    color: var(--secondary); border: 1px solid transparent; border-radius: var(--r-sm);
    padding: 4px 6px; outline: none;
  }
  .col-title:hover { background: var(--hover-tint); }
  .col-title:focus { border-color: var(--primary); background: var(--surface); }
  .col-count {
    font-size: 12px; font-weight: 600; color: var(--muted); background: var(--hover-tint);
    padding: 1px 8px; border-radius: var(--r-full); min-width: 20px; text-align: center;
  }

  .cards { flex: 1; overflow-y: auto; padding: 4px 8px; display: flex; flex-direction: column; gap: 8px; min-height: 12px; border-radius: var(--r-md); transition: background-color .12s ease; }
  /* drop target highlight while dragging */
  .cards.drag-over { background: rgba(38, 132, 255, .14); box-shadow: inset 0 0 0 2px var(--primary-60); }
  .column:has(.cards.drag-over) { border-color: var(--primary); }
  .card {
    box-sizing: border-box;
    background: var(--surface); border-radius: var(--r-md); padding: 10px 12px; font-size: 14px;
    line-height: 20px; border: 1px solid var(--border); box-shadow: var(--shadow-card);
    cursor: pointer; position: relative; transition: box-shadow .12s, border-color .12s;
  }
  .card:hover { border-color: var(--primary-60); box-shadow: var(--shadow-pop); }
  .card-text { white-space: pre-wrap; word-break: break-word; display: block; padding-right: 16px; color: var(--on-surface); }
  .card-foot { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
  .has-desc { color: var(--muted); font-size: 14px; }
  .card .del { position: absolute; top: 4px; right: 4px; display: none; color: var(--muted); padding: 2px 6px; border-radius: var(--r-sm); font-size: 13px; }
  .card:hover .del { display: block; }
  .card .del:hover { color: var(--error); background: #FFEBE6; }

  /* light mode: glass-lite. Softer than dark — a faint tinted board wash + lightly
     frosted white cards. :not([data-theme='dark']) also covers first paint (attr unset). */
  :global(html:not([data-theme='dark'])) .board {
    background:
      radial-gradient(60% 80% at 12% 0%, rgba(38, 132, 255, .10), transparent 60%),
      radial-gradient(55% 75% at 88% 12%, rgba(101, 84, 192, .09), transparent 62%),
      radial-gradient(70% 90% at 50% 110%, rgba(38, 132, 255, .07), transparent 60%),
      var(--neutral);
  }
  :global(html:not([data-theme='dark'])) .card {
    background: color-mix(in srgb, var(--surface) 72%, transparent);
    -webkit-backdrop-filter: blur(12px) saturate(140%);
    backdrop-filter: blur(12px) saturate(140%);
    border-color: rgba(255, 255, 255, .7);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .6),
                0 1px 2px rgba(9, 30, 66, .12), 0 2px 8px rgba(9, 30, 66, .06);
  }
  :global(html:not([data-theme='dark'])) .card:hover {
    border-color: var(--primary-60);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .6),
                0 0 0 1px color-mix(in srgb, var(--primary-60) 45%, transparent),
                0 10px 24px rgba(9, 30, 66, .14);
  }
  :global(html:not([data-theme='dark'])) .card.compact { background: color-mix(in srgb, var(--surface) 80%, transparent); }
  :global(html:not([data-theme='dark']) body > .card) {
    background: var(--surface);
    -webkit-backdrop-filter: none; backdrop-filter: none;
  }

  /* dark mode: glassmorphism. Cards are frosted/translucent; the board paints a
     colored gradient backdrop so the cards' backdrop-blur has something to refract. */
  :global(html[data-theme='dark']) .board {
    background:
      radial-gradient(60% 80% at 12% 0%, rgba(76, 154, 255, .14), transparent 60%),
      radial-gradient(55% 75% at 88% 12%, rgba(101, 84, 192, .16), transparent 62%),
      radial-gradient(70% 90% at 50% 110%, rgba(38, 132, 255, .10), transparent 60%),
      var(--neutral);
  }
  :global(html[data-theme='dark']) .card {
    background: color-mix(in srgb, var(--surface) 55%, transparent);
    -webkit-backdrop-filter: blur(14px) saturate(160%);
    backdrop-filter: blur(14px) saturate(160%);
    border-color: rgba(255, 255, 255, .12);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .07), 0 4px 14px rgba(0, 0, 0, .30);
  }
  :global(html[data-theme='dark']) .card:hover {
    border-color: color-mix(in srgb, var(--primary-60) 65%, transparent);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .12),
                0 0 0 1px color-mix(in srgb, var(--primary-60) 55%, transparent),
                0 12px 30px rgba(0, 0, 0, .50);
  }
  :global(html[data-theme='dark']) .card .del:hover {
    color: var(--error); background: color-mix(in srgb, var(--error) 18%, transparent);
  }
  :global(html[data-theme='dark']) .card.compact { background: color-mix(in srgb, var(--surface) 62%, transparent); }
  /* drag clone is re-parented to <body> (off the board), so it loses the glass backdrop —
     fall back to a near-opaque surface so the floating card stays readable mid-drag */
  :global(html[data-theme='dark'] body > .card) {
    background: var(--surface);
    -webkit-backdrop-filter: none; backdrop-filter: none;
  }

  .badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: var(--r-sm); letter-spacing: .3px; text-transform: uppercase; }
  .pr-low { background: #E3FCEF; color: #006644; }
  .pr-medium { background: #DEEBFF; color: #0052CC; }
  .pr-high { background: #FFF0B3; color: #974F0C; }
  .pr-urgent { background: #FFEBE6; color: #DE350B; }

  /* compact density */
  .board.compact .cards { gap: 4px; }
  /* compact styling lives on the card itself (not the .board ancestor) so it survives the
     drag clone, which svelte-dnd-action moves to <body> outside .board.compact.
     max-width caps the clone: without a parent column the nowrap title would otherwise
     stretch the floating card to full text width and break drop targeting */
  .card.compact { padding: 5px 10px 5px 13px; box-shadow: none; border-left: 3px solid var(--pr-color); max-width: 272px; }
  .card.compact:hover { box-shadow: var(--shadow-card); }
  .card.compact .card-tags, .card.compact .card-foot { display: none; }
  .card.compact .card-text {
    font-size: 13px; line-height: 18px; padding-right: 16px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  /* tags */
  .card-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
  .tag {
    display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600;
    line-height: 16px; padding: 2px 8px; border-radius: var(--r-sm); white-space: nowrap;
  }
  /* smaller chips on the board; full size kept in the modal */
  .card-tags .tag { font-size: 9px; line-height: 14px; padding: 0 6px; border-radius: 3px; letter-spacing: .2px; }
  .m-tags-section { display: flex; flex-direction: column; gap: 6px; }
  .m-tags {
    display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 8px;
    border: 1px solid var(--border); border-radius: var(--r-sm); min-height: 44px;
  }
  .m-tags:focus-within { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(38,132,255,.3); }
  .tag.removable { font-size: 12px; padding: 3px 6px 3px 10px; }
  .tag-x {
    background: transparent; border: none; cursor: pointer; color: inherit; opacity: .6;
    font-size: 15px; line-height: 1; padding: 0 1px; border-radius: var(--r-sm);
  }
  .tag-x:hover { opacity: 1; }
  .tag-input {
    flex: 1; min-width: 100px; border: none; outline: none; background: transparent;
    font-family: inherit; font-size: 14px; color: var(--on-surface); padding: 4px;
  }

  .add-card { margin: 4px 8px 12px; color: var(--muted); font-weight: 500; padding: 8px 10px; border-radius: var(--r-sm); text-align: left; }
  .add-card:hover { background: var(--hover-tint); color: var(--secondary); }
  .add-form { margin: 4px 8px 12px; display: flex; flex-direction: column; gap: 8px; }
  .add-form textarea {
    font-family: inherit; font-size: 14px; resize: vertical; min-height: 60px;
    background: var(--surface); color: var(--on-surface); border: 1px solid var(--primary);
    border-radius: var(--r-sm); padding: 10px 12px; outline: none; box-shadow: var(--shadow-card);
  }
  .add-form .row { display: flex; gap: 8px; align-items: center; }

  .add-column {
    width: 288px; flex-shrink: 0; background: var(--surface); border: 1px dashed var(--border);
    color: var(--muted); font-weight: 500; padding: 14px; border-radius: var(--r-lg); text-align: left;
  }
  .add-column:hover { background: var(--neutral); border-color: var(--primary-60); color: var(--secondary); }

  /* modal */
  .overlay { position: fixed; inset: 0; background: var(--overlay); display: flex; align-items: flex-start; justify-content: center; padding: 6vh 16px; z-index: 50; }
  .modal {
    background: var(--surface); border-radius: var(--r-lg); width: 100%; max-width: 640px;
    padding: 24px; display: flex; flex-direction: column; gap: 16px; box-shadow: var(--shadow-pop);
  }
  .modal-head { display: flex; align-items: center; gap: 10px; }
  .modal-id { color: var(--muted); font-size: 12px; font-weight: 600; }
  .m-title {
    font-size: 24px; font-weight: 500; line-height: 30px; background: transparent; color: var(--secondary);
    border: 1px solid transparent; border-radius: var(--r-sm); padding: 6px 8px; resize: none;
    font-family: inherit; outline: none; overflow: hidden; field-sizing: content;
  }
  .m-title:hover { background: var(--neutral); }
  .m-title:focus { border-color: var(--primary); background: var(--surface); }
  .m-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .m-grid label, .m-label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; }
  select {
    font-family: inherit; font-size: 14px; background-color: var(--surface); color: var(--on-surface);
    border: 1px solid var(--border); border-radius: var(--r-sm); padding: 12px 36px 12px 14px; outline: none;
    text-transform: none; font-weight: 400; cursor: pointer;
    appearance: none; -webkit-appearance: none; -moz-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='16'%20height='16'%20viewBox='0%200%2024%2024'%20fill='none'%20stroke='%23626F86'%20stroke-width='2'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Cpolyline%20points='6%209%2012%2015%2018%209'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 12px center; background-size: 16px;
  }
  select:hover { border-color: #B3BAC5; }
  select:focus { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(38,132,255,.3); }
  .m-desc {
    min-height: 140px; font-family: inherit; font-size: 16px; line-height: 24px; background: var(--surface);
    color: var(--on-surface); border: 1px solid var(--border); border-radius: var(--r-sm);
    padding: 12px 14px; resize: vertical; outline: none;
  }
  .m-desc:hover { border-color: #B3BAC5; }
  .m-desc:focus { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(38,132,255,.3); }
  .modal-foot { display: flex; align-items: center; gap: 10px; margin-top: 4px; padding-top: 16px; border-top: 1px solid var(--border); }
  .created { font-size: 12px; color: var(--muted); }

  /* delete confirmation */
  .btn-secondary {
    background: var(--surface); color: var(--secondary); font-weight: 500;
    border: 1px solid var(--border); padding: 10px 16px; border-radius: var(--r-sm);
  }
  .btn-secondary:hover { background: var(--neutral); border-color: #B3BAC5; }
  .confirm-overlay { align-items: center; z-index: 60; }
  .confirm {
    background: var(--surface); border-radius: var(--r-lg); width: 100%; max-width: 420px;
    padding: 24px; box-shadow: var(--shadow-pop); display: flex; flex-direction: column; gap: 8px;
  }
  .confirm h2 { margin: 0; font-size: 20px; font-weight: 500; color: var(--secondary); }
  .confirm p { margin: 0; font-size: 14px; line-height: 20px; color: var(--on-surface); word-break: break-word; }
  .confirm strong { font-weight: 600; }
  .confirm-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
</style>
