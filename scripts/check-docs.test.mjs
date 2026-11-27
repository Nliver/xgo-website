import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkDocs } from './check-docs.mjs';
import { discoverExamples, examplePagesForRevision, exampleRevisions } from './check-examples.mjs';

function withFixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xgo-doc-check-'));
  const docs = path.join(root, 'content/docs');
  fs.mkdirSync(docs, { recursive: true });
  const header = '---\ntitle: Example\ndescription: An example page.\n---\n';
  fs.writeFileSync(path.join(docs, 'index.mdx'), `${header}\n[Next](/docs/next?mode=read#details)\n<Card href="/docs/next" />\n`);
  fs.writeFileSync(path.join(docs, 'next.mdx'), `${header}\n## Details\n\nAn example.\n`);
  fs.writeFileSync(path.join(docs, 'meta.json'), JSON.stringify({ title: 'Docs', pages: ['index', 'next'] }));
  const metadata = { sourcePath: 'doc/docs.md', contentType: 'guide', sourceStatus: 'editorial', reviewStatus: 'technical-review', applicableVersion: 'source-snapshot' };
  fs.writeFileSync(path.join(root, 'content/sources.json'), JSON.stringify({
    sourceRepository: 'goplus/xgo', sourceCommit: 'c'.repeat(40), sourceCheckedAt: '2026-11-25',
    sourceLicense: 'Apache-2.0', licensePath: 'LICENSE',
    pages: { 'content/docs/index.mdx': metadata, 'content/docs/next.mdx': metadata },
  }));
  fs.writeFileSync(path.join(root, 'content/glossary.json'), JSON.stringify({ terms: [] }));
  try { run(root, docs, header); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test('accepts quoted MDX links, query strings, anchors, and root index URLs', () => withFixture((root) => {
  assert.deepEqual(checkDocs(root).errors, []);
}));

test('rejects missing Markdown and quoted JSX link targets and fragments', () => withFixture((root, docs) => {
  fs.appendFileSync(path.join(docs, 'index.mdx'), '\n[Missing](/docs/absent)\n<Card href="/docs/missing" />\n[Fragment](/docs/next#absent)\n');
  const errors = checkDocs(root).errors.join('\n');
  for (const target of ['/docs/absent', '/docs/missing', '/docs/next#absent']) assert.ok(errors.includes(target));
}));

test('checks standalone blog URLs and rejects links to the former docs paths', () => withFixture((root, docs, header) => {
  const file = path.join(root, 'content/sources.json');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  const metadata = { ...manifest.pages['content/docs/next.mdx'], contentType: 'blog' };
  manifest.pages['content/docs/blog/index.mdx'] = metadata;
  manifest.pages['content/docs/blog/post.mdx'] = metadata;
  manifest.pages['content/docs/blog/post.zh-CN.mdx'] = {
    ...metadata,
    locale: 'zh-CN',
    translationOf: 'content/docs/blog/post.mdx',
    translationReviewStatus: 'pending',
  };
  fs.writeFileSync(file, JSON.stringify(manifest));
  fs.mkdirSync(path.join(docs, 'blog'));
  fs.writeFileSync(path.join(docs, 'blog/index.mdx'), `${header}\n<a href="/blog/post#details">Read the post</a>\n`);
  fs.writeFileSync(path.join(docs, 'blog/post.mdx'), `${header}\n## Details\n\n[All posts](/blog)\n`);
  fs.writeFileSync(path.join(docs, 'blog/post.zh-CN.mdx'), `${header}\n## 详情\n\n[本节](/zh-CN/blog/post#详情)\n`);
  fs.appendFileSync(path.join(docs, 'index.mdx'), '\n[Blog](/blog)\n');
  assert.deepEqual(checkDocs(root).errors, []);

  fs.appendFileSync(path.join(docs, 'index.mdx'), '\n[Old URL](/docs/blog/post)\n[Missing heading](/blog/post#missing)\n');
  const errors = checkDocs(root).errors.join('\n');
  assert.match(errors, /internal link points to missing page \/docs\/blog\/post/);
  assert.match(errors, /internal link points to missing heading \/blog\/post#missing/);
}));

test('rejects language-free and unclosed fences', () => withFixture((root, docs) => {
  fs.appendFileSync(path.join(docs, 'index.mdx'), '\n```\nhello\n```\n\n```go\necho "hello"\n');
  const errors = checkDocs(root).errors.join('\n');
  assert.match(errors, /missing a language/);
  assert.match(errors, /unclosed code fence/);
}));

test('rejects invalid source values and missing navigation targets', () => withFixture((root, docs) => {
  const manifestPath = path.join(root, 'content/sources.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.sourceCommit = 'main';
  manifest.sourceCheckedAt = '2026-02-30';
  manifest.pages['content/docs/index.mdx'].sourceStatus = 'unchecked';
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  fs.writeFileSync(path.join(docs, 'meta.json'), JSON.stringify({ title: 'Docs', pages: ['absent'] }));
  const errors = checkDocs(root).errors.join('\n');
  for (const expected of ['full commit SHA', 'ISO calendar date', 'invalid sourceStatus', 'navigation target is missing']) assert.ok(errors.includes(expected));
}));

test('requires pinned revisions and relative paths for related projects', () => withFixture((root) => {
  const file = path.join(root, 'content/sources.json');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [commit, sourcePath] of [['main', 'README.md'], ['b'.repeat(40), '../README.md']]) {
    manifest.pages['content/docs/index.mdx'].externalSources = [{ repository: 'goplus/spx', commit, path: sourcePath }];
    fs.writeFileSync(file, JSON.stringify(manifest));
    assert.match(checkDocs(root).errors.join(' '), /invalid externalSources/);
  }
}));

test('rejects duplicate index URLs and body h1 headings', () => withFixture((root, docs, header) => {
  fs.mkdirSync(path.join(docs, 'next'));
  fs.writeFileSync(path.join(docs, 'next/index.mdx'), `${header}\n# Duplicate title\n`);
  const errors = checkDocs(root).errors.join('\n');
  assert.match(errors, /duplicate URL \/docs\/next/);
  assert.match(errors, /body h1 duplicates/);
}));

test('uses public URLs and physical source paths for a pathless docs group', () => withFixture((root, docs) => {
  const group = path.join(docs, '(xgo)');
  fs.mkdirSync(group);
  for (const name of ['index.mdx', 'next.mdx', 'meta.json']) {
    fs.renameSync(path.join(docs, name), path.join(group, name));
  }
  fs.writeFileSync(path.join(docs, 'meta.json'), JSON.stringify({ title: 'Docs', pages: ['(xgo)'] }));
  fs.writeFileSync(path.join(group, 'next.zh-CN.mdx'), '---\ntitle: 示例\ndescription: 编写第一个程序。\n---\n[原文](/docs/next#details)\n');
  const manifestPath = path.join(root, 'content/sources.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const original = 'content/docs/(xgo)/next.mdx';
  manifest.pages = {
    'content/docs/(xgo)/index.mdx': manifest.pages['content/docs/index.mdx'],
    [original]: manifest.pages['content/docs/next.mdx'],
    'content/docs/(xgo)/next.zh-CN.mdx': {
      ...manifest.pages['content/docs/next.mdx'],
      translationOf: original,
      translationReviewStatus: 'pending',
    },
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  assert.deepEqual(checkDocs(root).errors, []);
}));

test('rejects invalid candidate revisions and snippet mappings', () => withFixture((root) => {
  const file = path.join(root, 'content/sources.json');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  const metadata = manifest.pages['content/docs/index.mdx'];
  metadata.candidateSourceCommit = 'main';
  metadata.candidateChangedSources = ['unmapped.md'];
  metadata.upstreamSnippets = [{ id: 'hello', sourcePath: 'unmapped.md', heading: 'Example', codeBlockIndex: -1 }];
  fs.writeFileSync(file, JSON.stringify(manifest));
  const errors = checkDocs(root).errors.join('\n');
  for (const expected of ['invalid candidateSourceCommit', 'invalid candidateChangedSources', 'must use a mapped sourcePath', 'invalid upstream snippet selector', 'invalid upstream snippet markers']) assert.ok(errors.includes(expected));
}));

test('checks translated pages, links, and navigation without mixing English content', () => withFixture((root, docs) => {
  const file = path.join(root, 'content/sources.json');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  manifest.pages['content/docs/next.zh-CN.mdx'] = {
    ...manifest.pages['content/docs/next.mdx'],
    locale: 'zh-CN',
    translationOf: 'content/docs/next.mdx',
    translationReviewStatus: 'pending',
  };
  fs.writeFileSync(file, JSON.stringify(manifest));
  fs.writeFileSync(path.join(docs, 'next.zh-CN.mdx'), '---\ntitle: 示例\ndescription: 编写第一个程序。\n---\n## 运行程序\n\n[原文](/docs/next)\n[本节](/zh-CN/docs/next#运行程序)\n');
  fs.writeFileSync(path.join(docs, 'meta.zh-CN.json'), JSON.stringify({ title: '文档', pages: ['next'] }));
  assert.deepEqual(checkDocs(root).errors, []);
  fs.writeFileSync(path.join(docs, 'meta.zh-CN.json'), JSON.stringify({ title: '文档', pages: ['index'] }));
  assert.match(checkDocs(root).errors.join('\n'), /navigation target is missing index/);
  fs.appendFileSync(path.join(docs, 'next.mdx'), '\n中文正文\n');
  assert.match(checkDocs(root).errors.join('\n'), /Chinese prose detected in the English edition/);
}));

test('requires translated pages to identify their original and review status', () => withFixture((root, docs, header) => {
  const file = path.join(root, 'content/sources.json');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  manifest.pages['content/docs/next.zh-CN.mdx'] = { ...manifest.pages['content/docs/next.mdx'], locale: 'en' };
  fs.writeFileSync(file, JSON.stringify(manifest));
  fs.writeFileSync(path.join(docs, 'next.zh-CN.mdx'), header);
  const errors = checkDocs(root).errors.join('\n');
  assert.match(errors, /source locale does not match/);
  assert.match(errors, /translationOf must reference/);
  assert.match(errors, /invalid translationReviewStatus/);
}));

function withExamplesFixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xgo-example-check-'));
  const docs = path.join(root, 'content/docs');
  const header = '---\ntitle: Example\ndescription: An example page.\n---\n';
  const example = '```go title="hello.xgo"\nprintln "Hello"\n```\n\n```text\nHello\n```\n';
  const manifest = { sourceCommit: 'a'.repeat(40), pages: {} };
  for (const page of ['getting-started/hello-world.mdx', 'tutorials/new-topic.mdx', 'reference/overview.mdx']) {
    const file = path.join(docs, page);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, header + (page.startsWith('reference/') ? 'A page without executable examples.\n' : example));
    manifest.pages[`content/docs/${page}`] = { sourcePath: 'doc/docs.md' };
  }
  const manifestPath = path.join(root, 'content/sources.json');
  const saveManifest = () => fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  saveManifest();
  const executable = path.join(root, 'mock-xgo');
  const log = path.join(root, 'executions.jsonl');
  fs.writeFileSync(executable, `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.EXAMPLE_LOG, JSON.stringify({ args, files: fs.readdirSync(process.cwd()) }) + '\\n');
if (args[0] === 'version') console.log('xgo test compiler');
if (args[0] === 'run') console.log('Hello');
`, { mode: 0o755 });
  const script = fileURLToPath(new URL('./check-examples.mjs', import.meta.url));
  const invoke = (args = [], revision) => {
    const env = { ...process.env, XGO_BIN: executable, EXAMPLE_LOG: log };
    delete env.XGO_SOURCE_COMMIT;
    if (revision !== undefined) env.XGO_SOURCE_COMMIT = revision;
    return spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8', env });
  };
  try { run({ root, docs, manifest, saveManifest, invoke, log }); }
  finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test('discovers old and newly added runnable pages and executes both through the CLI', () => withExamplesFixture(({ root, docs, manifest, invoke, log }) => {
  assert.deepEqual(examplePagesForRevision(manifest, undefined, root), ['getting-started/hello-world.mdx', 'tutorials/new-topic.mdx']);
  fs.writeFileSync(path.join(docs, 'tutorials/new-topic.mdx'), '---\ntitle: Mixed example\ndescription: Mix Go and XGo.\n---\n```go title="a.go"\npackage main\n```\n```go title="b.xgo"\nprintln "Hello"\n```\n```text\nHello\n```\n');
  const result = invoke();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Executed 2 documentation examples successfully/);
  const executions = fs.readFileSync(log, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  assert.deepEqual(executions.filter(({ args }) => args[0] === 'run').map(({ args }) => args), [['run', 'hello.xgo'], ['run', '.']]);
  assert.ok(executions.some(({ args, files }) => args[0] === 'run' && files.includes('a.go') && files.includes('b.xgo')));
}));

test('selects discovered examples at per-page verified and candidate revisions', () => withExamplesFixture(({ root, manifest, saveManifest, invoke }) => {
  manifest.pages['content/docs/tutorials/new-topic.mdx'] = { sourcePath: 'doc/docs.md', sourceCommit: 'b'.repeat(40), candidateSourceCommit: 'c'.repeat(40) };
  saveManifest();
  assert.deepEqual(exampleRevisions(manifest, root), ['a'.repeat(40), 'b'.repeat(40), 'c'.repeat(40)]);
  assert.deepEqual(examplePagesForRevision(manifest, 'a'.repeat(40), root), ['getting-started/hello-world.mdx']);
  for (const revision of ['b'.repeat(40), 'c'.repeat(40)]) {
    assert.deepEqual(examplePagesForRevision(manifest, revision, root), ['tutorials/new-topic.mdx']);
    const result = invoke([], revision);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Executed 1 documentation examples successfully/);
  }
  const revisions = invoke(['--revisions']);
  assert.equal(revisions.status, 0, revisions.stderr);
  assert.deepEqual(JSON.parse(revisions.stdout), ['a'.repeat(40), 'b'.repeat(40), 'c'.repeat(40)]);
  assert.deepEqual(examplePagesForRevision(manifest, 'd'.repeat(40), root), []);
  manifest.pages['content/docs/tutorials/new-topic.mdx'].candidateSourceCommit = 'main';
  assert.throws(() => exampleRevisions(manifest, root), /full commit SHAs/);
}));

test('rejects newly discovered examples without source metadata in local and CI discovery', () => withExamplesFixture(({ root, manifest, saveManifest, invoke }) => {
  delete manifest.pages['content/docs/tutorials/new-topic.mdx'];
  saveManifest();
  assert.throws(() => exampleRevisions(manifest, root), /new-topic.mdx: missing source metadata/);
  for (const args of [[], ['--revisions']]) {
    const result = invoke(args, manifest.sourceCommit);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /new-topic.mdx: missing source metadata/);
  }
}));

test('rejects examples without expected output in local and CI discovery', () => withExamplesFixture(({ root, docs, manifest, invoke }) => {
  fs.appendFileSync(path.join(docs, 'tutorials/new-topic.mdx'), '\n```go title="missing.xgo"\nprintln "Hello"\n```\n');
  assert.throws(() => discoverExamples(root), /missing a text output block/);
  for (const args of [[], ['--revisions']]) {
    const result = invoke(args, manifest.sourceCommit);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /new-topic.mdx: example is missing a text output block/);
  }
}));

test('requires source filenames or a separate command for code paired with output', () => withExamplesFixture(({ root, docs }) => {
  const file = path.join(docs, 'reference/overview.mdx');
  const original = fs.readFileSync(file, 'utf8');
  const output = '\n```text\nHello\n```\n';
  const source = '\n```xgo\necho "Hello"\n```\n';
  fs.writeFileSync(file, original + source + output);
  assert.throws(() => discoverExamples(root), /overview.mdx: xgo code.*has expected output/);
  const separate = source.replace('```xgo', '```go verify="go run ."');
  fs.writeFileSync(file, original + separate + output);
  assert.ok(!discoverExamples(root).some(({ page }) => page === 'reference/overview.mdx'));
  fs.writeFileSync(file, original + separate + source.replace('```xgo', '```xgo title="main.xgo"') + output);
  assert.throws(() => discoverExamples(root), /overview.mdx: go code.*has expected output/);
  fs.writeFileSync(file, original + source + '\nAn unrelated section.\n' + output);
  assert.doesNotThrow(() => discoverExamples(root));
}));

test('lists the physical lines of unregistered snippets for review without running them', () => withExamplesFixture(({ root, docs, invoke, log }) => {
  const page = 'content/docs/reference/overview.mdx';
  const file = path.join(root, page);
  const body = fs.readFileSync(file, 'utf8') + '\n';
  const line = body.split('\n').length;
  fs.writeFileSync(file, body + '```xgo\necho 1\n```\n');
  const result = invoke(['--review-files', page, path.join(docs, 'tutorials/new-topic.mdx')]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), `- \`${page}\` · lines ${line}`);
  assert.ok(!fs.existsSync(log));
}));

test('discovers translated runnable examples using their own source record', () => withExamplesFixture(({ root, docs, manifest, saveManifest, invoke }) => {
  fs.copyFileSync(path.join(docs, 'getting-started/hello-world.mdx'), path.join(docs, 'getting-started/hello-world.zh-CN.mdx'));
  manifest.pages['content/docs/getting-started/hello-world.zh-CN.mdx'] = {
    ...manifest.pages['content/docs/getting-started/hello-world.mdx'],
    translationOf: 'content/docs/getting-started/hello-world.mdx',
  };
  saveManifest();
  assert.ok(examplePagesForRevision(manifest, manifest.sourceCommit, root).includes('getting-started/hello-world.zh-CN.mdx'));
  const result = invoke([], manifest.sourceCommit);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Executed 3 documentation examples successfully/);
}));
