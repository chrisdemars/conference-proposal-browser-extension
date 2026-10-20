// Turns a markdown file into { title, body, sections }.
//
// title    - text of the first heading (any level), or a name derived from the file name
// body     - everything after the title heading, as written in the file
// intro    - text between the title and the first subsection heading
// sections - headed subsections after the title, e.g. "Abstract" / "Description"

const HEADING = /^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/;
const FENCE = /^[ \t]*(```|~~~)/;

export function titleFromPath(path) {
  const name = path.split('/').pop().replace(/\.(md|markdown)$/i, '');
  return name
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

// Split markdown into blocks, starting a new block at each heading.
// A block before the first heading has heading === null.
export function splitByHeadings(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let current = { heading: null, level: 0, lines: [] };
  let inFence = false;

  for (const line of lines) {
    if (FENCE.test(line)) inFence = !inFence;
    const match = !inFence && HEADING.exec(line);
    if (match) {
      blocks.push(current);
      current = { heading: match[2], level: match[1].length, lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  blocks.push(current);

  return blocks
    .map(({ heading, level, lines }) => ({ heading, level, content: lines.join('\n').trim() }))
    .filter((b) => b.heading !== null || b.content !== '');
}

export function parseProposal(text, path) {
  const normalized = text.replace(/\r\n?/g, '\n');
  const blocks = splitByHeadings(normalized);
  const titleIndex = blocks.findIndex((b) => b.heading !== null);

  if (titleIndex === -1) {
    const body = normalized.trim();
    return { title: titleFromPath(path), body, intro: body, sections: [] };
  }

  const title = blocks[titleIndex].heading;
  const titleLine = normalized.split('\n').findIndex((l) => {
    const m = HEADING.exec(l);
    return m && m[2] === title;
  });
  const body = normalized.split('\n').slice(titleLine + 1).join('\n').trim();
  const sections = blocks
    .slice(titleIndex + 1)
    .filter((b) => b.heading !== null)
    .map(({ heading, content }) => ({ heading, content }));

  // Text between the title and the first subsection heading.
  const intro = blocks[titleIndex].content;

  return { title, body, intro, sections };
}

// Bio files can hold several bios ("Long Bio", "Short Bio", ...). Each heading
// becomes its own copyable entry; a file with no headings is a single entry.
export function parseBio(text, path) {
  const blocks = splitByHeadings(text);
  const fallback = titleFromPath(path);
  return blocks
    .map(({ heading, content }) => ({ heading: heading ?? fallback, content }))
    .filter((b) => b.content !== '');
}
