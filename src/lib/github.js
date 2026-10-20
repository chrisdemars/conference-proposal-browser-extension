import { EXCLUDE_PATTERNS, BIO_PATTERNS, FOLDER_LABELS } from './config.js';
import { parseProposal, parseBio } from './parse.js';

const API = 'https://api.github.com';
const RAW = 'https://raw.githubusercontent.com';

function apiHeaders(token) {
  const headers = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function request(url, options) {
  const res = await fetch(url, { cache: 'no-store', ...options });
  if (res.ok) return res;

  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get('x-ratelimit-reset');
    const when = reset ? ` Try again after ${new Date(reset * 1000).toLocaleTimeString()}.` : '';
    throw new Error(`GitHub rate limit reached.${when} Adding a token in settings raises the limit.`);
  }
  if (res.status === 404) {
    throw new Error('Repo or branch not found. Check settings (a private repo needs a token).');
  }
  if (res.status === 401) throw new Error('GitHub rejected the token. Check settings.');
  throw new Error(`GitHub request failed (${res.status}).`);
}

const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/');

function classify(path) {
  if (EXCLUDE_PATTERNS.some((re) => re.test(path))) return null;
  if (BIO_PATTERNS.some((re) => re.test(path.split('/').pop()))) return 'bio';
  return 'talk';
}

// Without a token, file contents come from raw.githubusercontent.com, which does
// not count against the API rate limit. With a token, use the blob API so private
// repos work.
async function fetchFile({ owner, repo, branch, token }, file) {
  if (token) {
    const res = await request(`${API}/repos/${owner}/${repo}/git/blobs/${file.sha}`, {
      headers: { ...apiHeaders(token), Accept: 'application/vnd.github.raw' },
    });
    return res.text();
  }
  const res = await request(`${RAW}/${owner}/${repo}/${encodePath(branch)}/${encodePath(file.path)}`);
  return res.text();
}

// Loads every markdown file in the repo. `previous` is the last result; files
// whose blob sha has not changed are reused instead of downloaded again.
export async function loadRepo(settings, previous) {
  const { owner, repo, branch, token } = settings;
  const res = await request(
    `${API}/repos/${owner}/${repo}/git/trees/${encodePath(branch)}?recursive=1`,
    { headers: apiHeaders(token) },
  );
  const tree = await res.json();

  const repoKey = `${owner}/${repo}@${branch}`;
  const reusable = previous?.repoKey === repoKey ? previous.files : {};
  if (previous?.repoKey === repoKey && previous.treeSha === tree.sha) {
    return { ...previous, fetchedAt: Date.now() };
  }

  const markdown = tree.tree.filter(
    (f) => f.type === 'blob' && /\.(md|markdown)$/i.test(f.path) && classify(f.path),
  );

  const files = {};
  await Promise.all(
    markdown.map(async (f) => {
      if (reusable[f.path]?.sha === f.sha) {
        files[f.path] = reusable[f.path];
        return;
      }
      const text = await fetchFile(settings, f);
      const kind = classify(f.path);
      const folder = f.path.includes('/') ? f.path.split('/')[0] : null;
      files[f.path] = {
        path: f.path,
        sha: f.sha,
        kind,
        label: FOLDER_LABELS[folder] ?? null,
        ...(kind === 'bio' ? { entries: parseBio(text, f.path) } : parseProposal(text, f.path)),
      };
    }),
  );

  return { repoKey, treeSha: tree.sha, truncated: !!tree.truncated, fetchedAt: Date.now(), files };
}
