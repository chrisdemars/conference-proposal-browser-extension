// Default repo settings. All of these can be changed from the popup's settings panel.
export const DEFAULT_SETTINGS = {
  owner: 'chrisdemars',
  repo: 'conference-proposals',
  // "HEAD" resolves to the repo's default branch.
  branch: 'HEAD',
  // Optional GitHub personal access token: only needed for a private repo
  // or if you hit the unauthenticated rate limit (60 requests/hour).
  token: '',
};

// Markdown files that are not talk proposals and should be hidden entirely.
export const EXCLUDE_PATTERNS = [/^readme\.md$/i, /^ideas\//i];

// Markdown files that go in the "Bio" tab instead of the "Talks" tab.
export const BIO_PATTERNS = [/bio/i, /^notes\.md$/i];

// Files under these folders get a label next to their title.
export const FOLDER_LABELS = { wkshps: 'Workshop' };

// How long cached data counts as fresh before the popup checks GitHub again.
export const CACHE_TTL_MS = 10 * 60 * 1000;
