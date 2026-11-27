import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { collectNodes, readPage } from './check-docs.mjs';

function documentationFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return documentationFiles(file);
    return /\.mdx?$/.test(entry.name) ? [file] : [];
  }).sort();
}

function exampleFilename(block) {
  const title = block.meta?.match(/(?:^|\s)title=(?:"([^"]+)"|'([^']+)')/);
  const filename = title?.[1] ?? title?.[2];
  if (filename && /\.(xgo|go)$/.test(filename)) return filename;
}

function reportManualExamples(files) {
  for (const file of files) {
    const { text, body, tree } = readPage(file);
    const headerLines = text.slice(0, text.length - body.length).split('\n').length - 1;
    const unregistered = collectNodes(tree, (block) => block.type === 'code' &&
      ['go', 'xgo'].includes(block.lang) && !exampleFilename(block));
    if (unregistered.length) {
      const lines = unregistered.map((block) => headerLines + block.position.start.line);
      console.log(`- \`${file}\` · lines ${lines.join(', ')}`);
    }
  }
}

// Inspect siblings so an output block in a different list item cannot claim a source.
function checkOutputGroups(tree, page) {
  for (const parent of collectNodes(tree, (node) => node.children?.some((child) => child.type === 'code' && child.lang === 'text'))) {
    let group = [];
    for (const block of parent.children) {
      if (block.type === 'code' && ['xgo', 'go'].includes(block.lang)) {
        group.push(block);
        continue;
      }
      if (block.type === 'code' && block.lang === 'text' && group.length) {
        const usesRunner = group.some(exampleFilename);
        for (const source of group) {
          if (exampleFilename(source)) continue;
          const command = source.meta?.match(/(?:^|\s)verify="([^"]+)"/)?.[1];
          if (usesRunner || !command?.trim()) {
            throw new Error(`${page}: ${source.lang} code on body line ${source.position.start.line} has expected output. Name each source with title, or document the separate verification command with verify="..." for the whole group.`);
          }
        }
      }
      group = [];
    }
  }
}

export function discoverExamples(root) {
  const docsRoot = path.join(root, 'content/docs');
  const pages = [];
  for (const file of documentationFiles(docsRoot)) {
    const page = path.relative(docsRoot, file).replaceAll(path.sep, '/');
    const { tree } = readPage(file);
    checkOutputGroups(tree, page);
    const examples = [];
    let sources = [];
    for (const block of collectNodes(tree, (node) => node.type === 'code')) {
      const filename = exampleFilename(block);
      if (filename) {
        if (!/^[a-z0-9-]+\.(xgo|go)$/.test(filename)) throw new Error(`${page}: example filename must be a simple basename`);
        if (sources.some((source) => source.title === filename)) throw new Error(`${page}: duplicate example filename ${filename}`);
        sources.push({ title: filename, value: block.value });
      }
      if (block.lang !== 'text' || !sources.length) continue;
      const mixed = sources.some((source) => source.title.endsWith('.go'));
      if (!mixed && sources.length !== 1) throw new Error(`${page}: each standalone program needs its own text output block`);
      examples.push({ sources, mixed, expected: block.value.trimEnd() });
      sources = [];
    }
    if (sources.length) throw new Error(`${page}: example is missing a text output block`);
    if (examples.length) pages.push({ page, examples });
  }
  if (!pages.length) throw new Error('No runnable documentation examples were found.');
  return pages;
}

function pageRevisions(manifest, page) {
  const metadata = manifest.pages?.[`content/docs/${page}`];
  if (!metadata || typeof metadata.sourcePath !== 'string' || !metadata.sourcePath.trim()) throw new Error(`${page}: missing source metadata`);
  const commits = [metadata.sourceCommit ?? manifest.sourceCommit];
  if (metadata.candidateSourceCommit !== undefined) commits.push(metadata.candidateSourceCommit);
  if (!commits.every((commit) => typeof commit === 'string' && /^[a-f0-9]{40}$/.test(commit))) throw new Error(`${page}: example source revisions must use full commit SHAs`);
  return new Set(commits);
}

function selectedExamples(root, manifest, revision) {
  if (revision !== undefined && !/^[a-f0-9]{40}$/.test(revision)) throw new Error('XGO_SOURCE_COMMIT must use a full commit SHA');
  return discoverExamples(root).filter(({ page }) => {
    const commits = pageRevisions(manifest, page);
    return revision === undefined || commits.has(revision);
  });
}

export function examplePagesForRevision(manifest, revision, root = process.cwd()) {
  return selectedExamples(root, manifest, revision).map(({ page }) => page);
}

export function exampleRevisions(manifest, root = process.cwd()) {
  const revisions = new Set();
  for (const { page } of discoverExamples(root)) {
    for (const commit of pageRevisions(manifest, page)) revisions.add(commit);
  }
  return [...revisions].sort();
}

function checkExamples(root, revision) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/sources.json'), 'utf8'));
  const pages = selectedExamples(root, manifest, revision);
  if (!pages.length) throw new Error('No runnable documentation pages match XGO_SOURCE_COMMIT');
  const executable = process.env.XGO_BIN ?? 'xgo';
  const version = spawnSync(executable, ['version'], { encoding: 'utf8' });
  if (version.error || version.status !== 0) throw new Error('XGo is required. Install it or set XGO_BIN to a built XGo executable.');
  console.log(version.stdout.trim());
  if (revision) console.log(`Checking examples for XGo source revision ${revision}.`);
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'xgo-doc-examples-'));
  let count = 0;

  function execute(args, directory, page) {
    const result = spawnSync(executable, args, {
      cwd: directory,
      encoding: 'utf8',
      timeout: 120_000,
      env: { ...process.env, GOWORK: 'off' },
    });
    if (result.error || result.status !== 0) throw new Error(`${page}: xgo ${args.join(' ')} failed\n${result.error?.message ?? ''}${result.stderr}${result.stdout}`);
    return result.stdout.replace(/\r\n/g, '\n').trimEnd();
  }

  try {
    for (const { page, examples } of pages) {
      for (const { sources, mixed, expected } of examples) {
        const directory = path.join(workspace, String(++count));
        fs.mkdirSync(directory);
        for (const source of sources) fs.writeFileSync(path.join(directory, source.title), `${source.value}\n`);
        if (mixed) execute(['mod', 'init', 'example.com/mixgo'], directory, page);
        const actual = execute(['run', mixed ? '.' : sources[0].title], directory, page);
        if (actual !== expected) throw new Error(`${page}: unexpected output for ${sources.map((source) => source.title).join(', ')}\nExpected:\n${expected}\nActual:\n${actual}`);
        console.log(`Passed ${page}: ${sources.map((source) => source.title).join(', ')}`);
      }
    }
    console.log(`Executed ${count} documentation examples successfully.`);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = process.cwd();
    if (process.argv[2] === '--review-files') {
      reportManualExamples(process.argv.slice(3));
    } else if (process.argv[2] === '--revisions') {
      const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/sources.json'), 'utf8'));
      console.log(JSON.stringify(exampleRevisions(manifest)));
    } else checkExamples(root, process.env.XGO_SOURCE_COMMIT);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
