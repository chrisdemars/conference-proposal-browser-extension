import { DEFAULT_SETTINGS, CACHE_TTL_MS } from './lib/config.js';
import { loadRepo } from './lib/github.js';

const ext = globalThis.browser ?? globalThis.chrome;
// Bump when the parsed format changes so old caches are ignored.
const CACHE_KEY = 'cache-v1';

const $ = (sel) => document.querySelector(sel);
const state = { settings: null, data: null, loading: false };

// ---------- storage ----------

async function getSettings() {
  const { settings } = await ext.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...settings };
}

function repoKey({ owner, repo, branch }) {
  return `${owner}/${repo}@${branch}`;
}

// ---------- clipboard ----------

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    if (!ok) throw new Error('Copy failed');
  }
}

function announce(message) {
  const el = $('#announcer');
  el.textContent = '';
  // Re-set on the next frame so repeated identical messages are still announced.
  requestAnimationFrame(() => (el.textContent = message));
}

function wireCopy(button, getText, description) {
  button.addEventListener('click', async () => {
    const original = button.textContent;
    try {
      await copyText(getText());
      button.textContent = 'Copied!';
      button.classList.add('copied');
      announce(`Copied ${description}`);
    } catch {
      button.textContent = 'Copy failed';
      announce(`Could not copy ${description}`);
    }
    setTimeout(() => {
      button.textContent = original;
      button.classList.remove('copied');
    }, 1400);
  });
}

// ---------- rendering ----------

function countLabel(text) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return `${words} words · ${text.length} chars`;
}

function textBlock(text) {
  const wrap = document.createElement('div');
  const p = document.createElement('div');
  p.className = 'text';
  p.textContent = text;
  const meta = document.createElement('p');
  meta.className = 'meta';
  meta.textContent = countLabel(text);
  wrap.append(p, meta);
  return wrap;
}

function sectionEl(heading, content, ownerTitle) {
  const el = $('#section-template').content.firstElementChild.cloneNode(true);
  el.querySelector('h3').textContent = heading;
  el.querySelector('.text').replaceWith(textBlock(content));
  const btn = el.querySelector('button');
  const what = ownerTitle ? `${heading} of “${ownerTitle}”` : heading;
  btn.setAttribute('aria-label', `Copy ${what}`);
  wireCopy(btn, () => content, what);
  return el;
}

function openPaths() {
  return new Set(
    [...document.querySelectorAll('#talk-list details[open]')].map((d) => d.dataset.path),
  );
}

function renderTalks(talks) {
  const list = $('#talk-list');
  const keepOpen = openPaths();
  list.replaceChildren();

  for (const talk of talks) {
    const li = $('#talk-template').content.firstElementChild.cloneNode(true);
    li.dataset.search = `${talk.title}\n${talk.body}`.toLowerCase();
    const details = li.querySelector('details');
    details.dataset.path = talk.path;
    details.open = keepOpen.has(talk.path);
    li.querySelector('.card-title').textContent = talk.title;

    if (talk.label) {
      const badge = li.querySelector('.badge');
      badge.textContent = talk.label;
      badge.hidden = false;
    }

    const copies = {
      title: talk.title,
      body: talk.body,
      all: `${talk.title}\n\n${talk.body}`,
    };
    const names = { title: 'title', body: 'body', all: 'title and body' };
    for (const btn of li.querySelectorAll('[data-copy]')) {
      const kind = btn.dataset.copy;
      btn.setAttribute('aria-label', `${btn.textContent} of “${talk.title}”`);
      wireCopy(btn, () => copies[kind], `${names[kind]} of “${talk.title}”`);
    }

    const sections = li.querySelector('.sections');
    if (talk.sections.length === 0) {
      sections.append(textBlock(talk.body || '(No body text in this file yet.)'));
    } else {
      if (talk.intro) sections.append(textBlock(talk.intro));
      for (const s of talk.sections) sections.append(sectionEl(s.heading, s.content, talk.title));
    }

    li.querySelector('.file-path').textContent = talk.path;
    list.append(li);
  }

  $('#talk-count').textContent = talks.length ? `(${talks.length})` : '';
  applySearch();
}

function renderBio(bios) {
  const list = $('#bio-list');
  list.replaceChildren();
  for (const file of bios) {
    for (const entry of file.entries) {
      const li = document.createElement('li');
      li.className = 'card card-flat';
      const section = sectionEl(entry.heading, entry.content);
      const source = document.createElement('p');
      source.className = 'file-path';
      source.textContent = file.path;
      section.append(source);
      li.append(section);
      list.append(li);
    }
  }
  if (!list.children.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No bio files found (looking for file names containing “bio”).';
    list.append(li);
  }
}

function render() {
  const files = Object.values(state.data?.files ?? {});
  const byTitle = (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  renderTalks(files.filter((f) => f.kind === 'talk').sort(byTitle));
  renderBio(files.filter((f) => f.kind === 'bio').sort((a, b) => a.path.localeCompare(b.path)));
}

// ---------- search / expand ----------

function applySearch() {
  const terms = $('#search').value.toLowerCase().split(/\s+/).filter(Boolean);
  let visible = 0;
  for (const li of $('#talk-list').children) {
    const match = terms.every((t) => li.dataset.search.includes(t));
    li.hidden = !match;
    if (match) visible++;
  }
  $('#no-results').hidden = visible > 0 || !state.data;
}

function updateExpandButton() {
  const all = [...document.querySelectorAll('#talk-list li:not([hidden]) details')];
  const anyClosed = all.some((d) => !d.open);
  $('#expand-all').textContent = anyClosed ? 'Expand all' : 'Collapse all';
}

$('#search').addEventListener('input', () => {
  applySearch();
  updateExpandButton();
});

$('#expand-all').addEventListener('click', () => {
  const all = [...document.querySelectorAll('#talk-list li:not([hidden]) details')];
  const open = all.some((d) => !d.open);
  for (const d of all) d.open = open;
  updateExpandButton();
});

$('#talk-list').addEventListener('toggle', updateExpandButton, true);

// ---------- tabs ----------

const tabs = [...document.querySelectorAll('[role="tab"]')];

function selectTab(tab, focus = false) {
  for (const t of tabs) {
    const selected = t === tab;
    t.setAttribute('aria-selected', String(selected));
    t.tabIndex = selected ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !selected;
  }
  if (focus) tab.focus();
  try {
    localStorage.setItem('tab', tab.id);
  } catch {}
}

for (const tab of tabs) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(tab);
    const next = {
      ArrowRight: tabs[(i + 1) % tabs.length],
      ArrowLeft: tabs[(i - 1 + tabs.length) % tabs.length],
      Home: tabs[0],
      End: tabs[tabs.length - 1],
    }[e.key];
    if (next) {
      e.preventDefault();
      selectTab(next, true);
    }
  });
}

// ---------- status / loading ----------

function timeAgo(ms) {
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(ms).toLocaleDateString();
}

function setStatus(text, isError = false) {
  const el = $('#status');
  el.textContent = text;
  el.classList.toggle('error', isError);
}

function updateRepoLink() {
  const { owner, repo } = state.settings;
  $('#repo-link').href = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

async function refresh() {
  if (state.loading) return;
  state.loading = true;
  const btn = $('#refresh');
  btn.classList.add('spinning');
  btn.disabled = true;
  setStatus(state.data ? 'Checking for updates…' : 'Loading from GitHub…');

  try {
    state.data = await loadRepo(state.settings, state.data);
    await ext.storage.local.set({ [CACHE_KEY]: state.data });
    render();
    const warn = state.data.truncated ? ' (repo too large: some files skipped)' : '';
    setStatus(`Updated ${timeAgo(state.data.fetchedAt)}${warn}`);
  } catch (err) {
    const stale = state.data ? ` Showing data from ${timeAgo(state.data.fetchedAt)}.` : '';
    setStatus(`${err.message}${stale}`, true);
  } finally {
    state.loading = false;
    btn.classList.remove('spinning');
    btn.disabled = false;
  }
}

$('#refresh').addEventListener('click', refresh);

// ---------- settings ----------

const form = $('#settings');
const toggle = $('#settings-toggle');

function showSettings(show) {
  form.hidden = !show;
  toggle.setAttribute('aria-expanded', String(show));
  if (show) {
    for (const [k, v] of Object.entries(state.settings)) {
      if (form.elements[k]) form.elements[k].value = k === 'branch' && v === 'HEAD' ? '' : v;
    }
    form.elements.owner.focus();
  }
}

toggle.addEventListener('click', () => showSettings(form.hidden));
$('#settings-cancel').addEventListener('click', () => {
  showSettings(false);
  toggle.focus();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const value = (name) => form.elements[name].value.trim();
  const settings = {
    owner: value('owner'),
    repo: value('repo'),
    branch: value('branch') || 'HEAD',
    token: value('token'),
  };
  const changedRepo = repoKey(settings) !== repoKey(state.settings);
  state.settings = settings;
  await ext.storage.local.set({ settings });
  if (changedRepo) {
    state.data = null;
    await ext.storage.local.remove(CACHE_KEY);
    render();
  }
  updateRepoLink();
  showSettings(false);
  toggle.focus();
  refresh();
});

// ---------- init ----------

async function init() {
  try {
    const saved = localStorage.getItem('tab');
    const tab = saved && document.getElementById(saved);
    if (tab) selectTab(tab);
  } catch {}

  state.settings = await getSettings();
  updateRepoLink();

  const { [CACHE_KEY]: cached } = await ext.storage.local.get(CACHE_KEY);
  if (cached?.repoKey === repoKey(state.settings)) {
    state.data = cached;
    render();
    setStatus(`Updated ${timeAgo(cached.fetchedAt)}`);
  }

  if (!state.data || Date.now() - state.data.fetchedAt > CACHE_TTL_MS) refresh();
  if (!$('#panel-talks').hidden) $('#search').focus();
}

init();
