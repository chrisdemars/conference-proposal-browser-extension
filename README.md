# CFP Helper

A browser extension for Chrome, Edge, and Firefox that lists every talk proposal and bio from
[chrisdemars/conference-proposals](https://github.com/chrisdemars/conference-proposals) with
one-click copy buttons, so you don't have to open GitHub every time you fill in a CFP.

## Features

- **Talks tab**: every proposal, sorted by title, with search and expand/collapse.
  - *Copy title*, *Copy body*, *Copy title + body*
  - Per-section copy for files with subsections (e.g. `### Abstract`, `### Description`)
  - Word and character counts for checking CFP length limits
- **Bio tab**: each bio section (Long Bio, Short Bio, Notes from `bio.md`, plus `short-bio.md` and `notes.md`) with its own copy button
- Caches content so the popup opens instantly, then checks GitHub for changes (at most every 10 minutes, or when you click ↻). Unchanged files are not downloaded again.
- Settings (⚙) to point at a different owner/repo/branch, or to add a GitHub token for a private repo

## How files are read

| File | Shown as |
| --- | --- |
| `README.md`, `ideas/*` | hidden |
| file name contains `bio`, or `notes.md` | Bio tab, split at each heading |
| `wkshps/*` | Talks tab, with a "Workshop" badge |
| any other `.md` | Talks tab. **Title** is the first heading (`#`/`##`/…) and **body** is everything after it |

These rules are in `src/lib/config.js`.

## Install (unpacked, for your own use)

**Chrome**: go to `chrome://extensions`, turn on *Developer mode*, click *Load unpacked*, and select this folder.

**Edge**: go to `edge://extensions`, turn on *Developer mode*, click *Load unpacked*, and select this folder.

**Firefox**: go to `about:debugging#/runtime/this-firefox`, click *Load Temporary Add-on…*, and select `manifest.json`.
A temporary add-on is removed when Firefox restarts. To install it permanently, sign it via
[addons.mozilla.org](https://addons.mozilla.org/developers/) (an unlisted, self-distributed submission works),
or use Firefox Developer Edition with `xpinstall.signatures.required` set to `false`.

Pin the extension to your toolbar for one-click access.

## Development

```sh
npm test                       # parser unit tests (Node 18+)
npm run package                # builds dist/cfp-helper-{chrome,edge,firefox}-<version>.zip
python3 scripts/make-icons.py  # regenerates icons/
npx web-ext lint --ignore-files 'test/**' 'scripts/**' 'dist/**' package.json README.md
```

All three browsers use the same Manifest V3 files. There is no build step or dependency.
