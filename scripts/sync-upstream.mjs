import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const hash = (content) => crypto.createHash('sha256').update(content).digest('hex');
const validPath = (file) => typeof file === 'string' && !file.startsWith('/') && file.split('/').every((part) => part && part !== '.' && part !== '..') && /^[\w./-]+$/.test(file);

export function sourceSnippet(text, mapping) {
  const lines = text.replaceAll('\r\n', '\n').split('\n');
  const headings = lines.map((line, index) => ({ match: line.match(/^(#{1,6})\s+(.+?)\s*#*$/), index })).filter(({ match }) => match);
  const matches = headings.filter(({ match }) => match[2] === mapping.heading);
  if (matches.length !== 1) throw new Error(`Source heading must match exactly once for snippet ${mapping.id}.`);
  const start = matches[0];
  const end = headings.find(({ match, index }) => index > start.index && match[1].length <= start.match[1].length)?.index ?? lines.length;
  const blocks = [...lines.slice(start.index + 1, end).join('\n').matchAll(/^```[^\n]*\n([\s\S]*?)\n```[\t ]*$/gm)];
  if (!Number.isInteger(mapping.codeBlockIndex) || !blocks[mapping.codeBlockIndex]) throw new Error(`Missing source code block for snippet ${mapping.id}.`);
  return blocks[mapping.codeBlockIndex][1];
}

export function replaceSnippet(page, mapping, before, after) {
  if (!/^[a-z0-9-]+$/.test(mapping.id)) throw new Error('Invalid snippet ID.');
  const start = `{/* upstream-snippet:${mapping.id}:start */}`;
  const end = `{/* upstream-snippet:${mapping.id}:end */}`;
  if (page.split(start).length !== 2 || page.split(end).length !== 2) throw new Error(`Snippet markers must match exactly once for ${mapping.id}.`);
  if (page.indexOf(end) < page.indexOf(start)) throw new Error(`Invalid snippet marker order for ${mapping.id}.`);
  const region = page.slice(page.indexOf(start) + start.length, page.indexOf(end));
  const block = region.match(/^(\s*```[^\n]*\n)([\s\S]*?)(\n```\s*)$/);
  if (!block || block[2] !== before) throw new Error(`Snippet ${mapping.id} contains an editorial change. Review it manually.`);
  return page.replace(`${start}${region}${end}`, `${start}${block[1]}${after}${block[3]}${end}`);
}

export async function syncUpstream({ root = process.cwd(), write = false, initialize = false, fetcher = fetch } = {}) {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'scripts/upstream-manifest.json'), 'utf8'));
  const sources = JSON.parse(fs.readFileSync(path.join(root, 'content/sources.json'), 'utf8'));
  const outputDir = path.join(root, 'upstream-sync');
  const outputPath = path.join(outputDir, 'manifest.json');
  const previous = fs.existsSync(outputPath) ? JSON.parse(fs.readFileSync(outputPath, 'utf8')) : null;
  const mappedFiles = Object.values(sources.pages).flatMap((page) => [page.sourcePath, ...(page.additionalSourcePaths ?? [])]);
  const trackedFiles = [...new Set([...config.files, ...mappedFiles, ...(sources.licensePath ? [sources.licensePath] : [])])].sort();
  if (!/^[\w.-]+\/[\w.-]+$/.test(config.repository) || !trackedFiles.every(validPath) || new Set(config.files).size !== config.files.length) throw new Error('Invalid upstream repository or source path.');
  if (sources.sourceRepository && sources.sourceRepository !== config.repository) throw new Error('Content sources and upstream synchronization must use the same repository.');
  if (previous && (previous.repository !== config.repository || previous.ref !== config.ref)) throw new Error('Upstream repository or ref changed. Review the baseline manually.');
  const api = `https://api.github.com/repos/${config.repository}`;
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'xgo-website-upstream-sync' };
  async function request(url, json = true) {
    const response = await fetcher(url, { headers, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Upstream request failed (${response.status}) for ${url}. No candidate was written.`);
    return json ? response.json() : response.text();
  }
  const commit = await request(`${api}/commits/${encodeURIComponent(config.ref)}`);
  if (!/^[0-9a-f]{40}$/.test(commit.sha)) throw new Error('Invalid upstream commit SHA.');
  if (initialize && (commit.sha !== sources.sourceCommit || (previous && previous.commit !== commit.sha) || Object.values(sources.pages).some((page) => page.candidateSourceCommit || (page.sourceCommit && page.sourceCommit !== commit.sha)))) throw new Error('Initialization requires one pinned, verified source revision and no pending page candidates.');
  if (previous && previous.commit !== commit.sha) {
    const comparison = await request(`${api}/compare/${previous.commit}...${commit.sha}`);
    if (!['ahead', 'identical'].includes(comparison.status)) throw new Error('Upstream history was rewritten or moved backwards. Review the baseline manually.');
  }
  const rawUrl = (sha, file) => `https://raw.githubusercontent.com/${config.repository}/${sha}/${file}`;
  const blobUrl = (sha, file) => `https://github.com/${config.repository}/blob/${sha}/${file}`;
  const contents = new Map();
  const entries = [];
  for (const file of trackedFiles) {
    const content = await request(rawUrl(commit.sha, file), false);
    contents.set(file, content);
    entries.push({ path: file, sha256: hash(content), bytes: Buffer.byteLength(content), url: blobUrl(commit.sha, file) });
  }
  const before = new Map((previous?.files ?? []).map((file) => [file.path, file.sha256]));
  const after = new Set(trackedFiles);
  const removed = [...before.keys()].filter((file) => !after.has(file));
  if (removed.length) throw new Error(`Allowlist removed baseline files (${removed.join(', ')}). Review deletion or rename manually.`);
  const added = initialize ? [] : entries.filter((file) => !before.has(file.path));
  const changed = initialize ? [] : entries.filter((file) => before.has(file.path) && before.get(file.path) !== file.sha256);
  const migration = previous?.schemaVersion !== 3;
  if (previous && !added.length && !changed.length && !migration && !initialize) return { written: false, commit: commit.sha, added: 0, changed: 0 };

  const changes = [];
  const patches = new Map();
  const documentUpdates = new Map();
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'xgo-source-diff-'));
  try {
    for (const entry of [...added, ...changed]) {
      const oldContent = before.has(entry.path) ? await request(rawUrl(previous.commit, entry.path), false) : '';
      if (before.has(entry.path) && hash(oldContent) !== before.get(entry.path)) throw new Error(`Baseline hash mismatch for ${entry.path}.`);
      fs.writeFileSync(path.join(temporary, 'before'), oldContent);
      fs.writeFileSync(path.join(temporary, 'after'), contents.get(entry.path));
      const result = spawnSync('git', ['diff', '--no-index', '--no-ext-diff', '--no-color', '--', 'before', 'after'], { cwd: temporary, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
      if (![0, 1].includes(result.status)) throw new Error(`Could not generate source diff for ${entry.path}.`);
      const affectedPages = Object.entries(sources.pages).filter(([, page]) => entry.path === sources.licensePath || [page.sourcePath, ...(page.additionalSourcePaths ?? [])].includes(entry.path)).map(([file]) => file);
      changes.push({ path: entry.path, status: before.has(entry.path) ? 'modified' : 'newly-tracked', sourceUrl: entry.url, affectedPages, reviewRequired: ['technical', 'English editorial'] });
      patches.set(`${entry.path}.diff`, result.stdout.replaceAll('a/before', `a/${entry.path}`).replaceAll('b/after', `b/${entry.path}`));
    }
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
  const modifiedPaths = new Set(changed.map((entry) => entry.path));
  const updatedSources = structuredClone(sources);
  for (const [file, metadata] of Object.entries(sources.pages)) {
    const affected = changes.filter((entry) => entry.status === 'modified' && entry.affectedPages.includes(file));
    if (!affected.length) continue;
    if (!validPath(file) || !file.startsWith('content/docs/')) throw new Error('Invalid document path in source mapping.');
    const mappings = (metadata.upstreamSnippets ?? []).filter((mapping) => modifiedPaths.has(mapping.sourcePath));
    const original = mappings.length ? fs.readFileSync(path.join(root, file), 'utf8') : null;
    let page = original;
    for (const mapping of mappings) {
      if (![metadata.sourcePath, ...(metadata.additionalSourcePaths ?? [])].includes(mapping.sourcePath)) throw new Error('Snippet source must be a mapped page source.');
      const verifiedCommit = metadata.sourceCommit ?? sources.sourceCommit;
      if (!/^[0-9a-f]{40}$/.test(verifiedCommit)) throw new Error('A mapped snippet requires a verified source commit.');
      const oldSource = await request(rawUrl(verifiedCommit, mapping.sourcePath), false);
      page = replaceSnippet(page, mapping, sourceSnippet(oldSource, mapping), sourceSnippet(contents.get(mapping.sourcePath), mapping));
    }
    if (page !== original) documentUpdates.set(file, page);
    // Candidate provenance remains distinct from the last human-verified source commit.
    updatedSources.pages[file].candidateSourceCommit = commit.sha;
    updatedSources.pages[file].candidateChangedSources = affected.map((entry) => entry.path);
  }
  const sourcesChanged = JSON.stringify(updatedSources) !== JSON.stringify(sources);
  const candidateFiles = [...documentUpdates.keys(), ...(sourcesChanged ? ['content/sources.json'] : [])].sort();
  const candidateId = hash(JSON.stringify({ base: previous?.commit, source: commit.sha, sources: entries, documents: [...documentUpdates], metadata: updatedSources })).slice(0, 16);
  const current = { schemaVersion: 3, generatorVersion: 3, repository: config.repository, ref: config.ref, commit: commit.sha, sourceUpdatedAt: commit.commit.committer.date, files: entries };
  const lines = [
    '# XGo source review candidate', '',
    `Source repository [${config.repository}](https://github.com/${config.repository}).`, '',
    `Source commit [${commit.sha}](https://github.com/${config.repository}/commit/${commit.sha}).`, '',
    ...(previous && previous.commit !== commit.sha ? [`Compare [${previous.commit.slice(0, 12)} to ${commit.sha.slice(0, 12)}](https://github.com/${config.repository}/compare/${previous.commit}...${commit.sha}).`, ''] : []),
    `Source last updated ${current.sourceUpdatedAt}. Generated with generator version 3.`, '',
    'The candidate records source changes for human technical and English editorial review. Review each affected page, its examples, and its source metadata before publishing an update.', '',
  ];
  if (!changes.length) lines.push(initialize ? 'This initial baseline records the pinned source files used to prepare the documentation. No source changes are pending.' : 'The source hashes are unchanged. This candidate upgrades the source manifest format and permanent links.', '');
  if (changes.length) lines.push(`${changes.length} source files require review. The complete change index is in \`upstream-sync/changes.json\`. Source diffs are stored as separate files so the PR description stays readable.`, '');
  if (documentUpdates.size) lines.push('The candidate also updates explicitly mapped code snippets in the documentation. Page provenance retains the last human-verified source commit until reviewers approve the candidate.', '', ...[...documentUpdates.keys()].map((file) => `- \`${file}\``), '');
  for (const change of changes.slice(0, 40)) {
    lines.push(`## ${change.path}`, '', `${change.status === 'newly-tracked' ? 'Newly tracked source. ' : ''}[Read source](${change.sourceUrl}) and review the source diff in \`upstream-sync/changes/${change.path}.diff\`.`, '', 'Affected pages', '', ...change.affectedPages.slice(0, 10).map((file) => `- \`${file}\``), ...(change.affectedPages.length ? [] : ['- Requires manual content triage']), ...(change.affectedPages.length > 10 ? [`- ${change.affectedPages.length - 10} additional pages are listed in the complete change index`] : []), '');
  }
  if (changes.length > 40) lines.push(`${changes.length - 40} additional sources are listed in the complete change index.`, '');
  lines.push('## Required review', '', '- [ ] Verify language and toolchain behavior against the source diff', '- [ ] Update affected English pages and examples', '- [ ] Run documentation checks and executable examples', '- [ ] Complete human technical and English editorial review', '- [ ] For each approved page, set its sourceCommit to candidateSourceCommit, update sourceCheckedAt, and remove candidateSourceCommit and candidateChangedSources', '- [ ] Merge manually after review');
  const report = `${lines.join('\n')}\n`;
  if (Buffer.byteLength(report) > 60_000) throw new Error('Review summary exceeds 60 KB. Reduce the tracked-source batch before generating a PR.');
  if (write) {
    // All network, ancestry, hash, and deletion checks finish before replacing local output.
    fs.mkdirSync(outputDir, { recursive: true });
    fs.rmSync(path.join(outputDir, 'changes'), { recursive: true, force: true });
    for (const [file, patch] of patches) {
      const target = path.join(outputDir, 'changes', file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, patch);
    }
    fs.writeFileSync(outputPath, `${JSON.stringify(current, null, 2)}\n`);
    fs.writeFileSync(path.join(outputDir, 'changes.json'), `${JSON.stringify({ candidateId, baseCommit: previous?.commit ?? null, sourceCommit: commit.sha, candidateFiles, changes }, null, 2)}\n`);
    fs.writeFileSync(path.join(outputDir, 'report.md'), report);
    for (const [file, text] of documentUpdates) fs.writeFileSync(path.join(root, file), text);
    if (sourcesChanged) fs.writeFileSync(path.join(root, 'content/sources.json'), `${JSON.stringify(updatedSources, null, 2)}\n`);
  }
  return { written: write, commit: commit.sha, added: added.length, changed: changed.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(JSON.stringify(await syncUpstream({ write: process.argv.includes('--write'), initialize: process.argv.includes('--initialize') })));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
