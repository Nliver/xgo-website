import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { replaceSnippet, sourceSnippet, syncUpstream } from './sync-upstream.mjs';
import { candidatePaths, createCandidatePr, selectCandidateAction } from './sync-upstream-pr.mjs';

const oldSha = 'a'.repeat(40);
const newSha = 'b'.repeat(40);
const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');

function fixture(t, { content = 'before\n', status = 'ahead', missing = false, baselineHash = digest('before\n'), files = ['doc/test.md'], sourcePaths = ['doc/test.md'], licensePath, oldContent = 'before\n', verifiedContent, pageText, pageMetadata = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xgo-sync-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const directory of ['scripts', 'content', 'upstream-sync']) fs.mkdirSync(path.join(root, directory));
  fs.writeFileSync(path.join(root, 'scripts/upstream-manifest.json'), JSON.stringify({ repository: 'goplus/xgo', ref: 'main', files }));
  fs.writeFileSync(path.join(root, 'content/sources.json'), JSON.stringify({ licensePath, pages: sourcePaths.length ? { 'content/docs/example.mdx': { sourcePath: sourcePaths[0], additionalSourcePaths: sourcePaths.slice(1), ...pageMetadata } } : {} }));
  if (pageText) {
    fs.mkdirSync(path.join(root, 'content/docs'));
    fs.writeFileSync(path.join(root, 'content/docs/example.mdx'), pageText);
  }
  const baseline = { schemaVersion: 3, repository: 'goplus/xgo', ref: 'main', commit: oldSha, files: [{ path: 'doc/test.md', sha256: baselineHash }] };
  fs.writeFileSync(path.join(root, 'upstream-sync/manifest.json'), JSON.stringify(baseline));
  fs.writeFileSync(path.join(root, 'upstream-sync/report.md'), 'preserve accepted report');
  const requests = [];
  const fetcher = async (url) => {
    requests.push(url);
    let value;
    if (url.endsWith('/commits/main')) value = { sha: newSha, commit: { committer: { date: '2026-11-24T00:00:00Z' } } };
    else if (url.includes('/compare/')) value = { status };
    else if (url.includes(`/${oldSha}/`)) value = oldContent;
    else if (url.includes(`/${'c'.repeat(40)}/`) && verifiedContent) value = verifiedContent;
    else if (url.includes(`/${newSha}/`)) value = content;
    else throw new Error(`Unexpected request ${url}`);
    return { ok: !missing || !url.includes('raw.githubusercontent.com'), status: missing ? 404 : 200, json: async () => value, text: async () => value };
  };
  return { root, fetcher, requests, manifest: () => fs.readFileSync(path.join(root, 'upstream-sync/manifest.json'), 'utf8'), report: () => fs.readFileSync(path.join(root, 'upstream-sync/report.md'), 'utf8') };
}

test('unrelated upstream commits do not change accepted outputs', async (t) => {
  const f = fixture(t);
  const before = f.manifest();
  assert.equal((await syncUpstream({ ...f, write: true })).written, false);
  assert.equal(f.manifest(), before);
  assert.equal(f.report(), 'preserve accepted report');
  assert(f.requests.filter((url) => url.includes('raw.githubusercontent.com')).every((url) => url.includes(newSha)));
});

test('source changes produce a permanent diff and affected page, then repeat without writes', async (t) => {
  const f = fixture(t, { content: 'after\n' });
  assert.equal((await syncUpstream({ ...f, write: true })).changed, 1);
  assert.match(fs.readFileSync(path.join(f.root, 'upstream-sync/changes/doc/test.md.diff'), 'utf8'), /-before\n\+after/);
  assert.match(f.report(), /content\/docs\/example.mdx/);
  assert.match(f.report(), new RegExp(`/blob/${newSha}/doc/test.md`));
  const before = f.manifest();
  const report = f.report();
  assert.equal((await syncUpstream({ ...f, write: true })).written, false);
  assert.equal(f.manifest(), before);
  assert.equal(f.report(), report);
});

for (const [name, options, error] of [
  ['deleted source', { missing: true }, /404/],
  ['rewritten history', { status: 'diverged' }, /rewritten/],
  ['allowlist and source mapping deletion', { files: [], sourcePaths: [] }, /removed baseline/],
  ['baseline hash mismatch', { content: 'after\n', baselineHash: '0'.repeat(64) }, /hash mismatch/],
]) {
  test(`${name} preserves the accepted output`, async (t) => {
    const f = fixture(t, options);
    const before = f.manifest();
    await assert.rejects(syncUpstream({ ...f, write: true }), error);
    assert.equal(f.manifest(), before);
    assert.equal(f.report(), 'preserve accepted report');
  });
}


test('default tracking derives mapped sources, additional sources, and the source license', async (t) => {
  const f = fixture(t, { files: [], sourcePaths: ['README.md', 'doc/test.md'], licensePath: 'LICENSE', content: 'after\n' });
  await syncUpstream({ ...f, write: true });
  const manifest = JSON.parse(f.manifest());
  assert.deepEqual(manifest.files.map((file) => file.path), ['LICENSE', 'README.md', 'doc/test.md']);
  const changes = JSON.parse(fs.readFileSync(path.join(f.root, 'upstream-sync/changes.json'), 'utf8')).changes;
  assert.deepEqual(changes.find((file) => file.path === 'doc/test.md').affectedPages, ['content/docs/example.mdx']);
  assert.deepEqual(changes.find((file) => file.path === 'README.md').affectedPages, ['content/docs/example.mdx']);
  assert.deepEqual(changes.find((file) => file.path === 'LICENSE').affectedPages, ['content/docs/example.mdx']);
  assert.match(f.report(), /Newly tracked source/);
  assert(Buffer.byteLength(f.report()) < 60_000);
});

test('external-only README mappings do not become XGo source mappings', async (t) => {
  const f = fixture(t, {
    files: ['doc/test.md'],
    sourcePaths: ['README.md'],
    content: 'after\n',
    pageMetadata: {
      externalSources: [{
        repository: 'xgo-dev/llgo',
        commit: newSha,
        path: 'README.md',
      }],
    },
  });
  await syncUpstream({ ...f, write: true });
  const manifest = JSON.parse(f.manifest());
  assert.deepEqual(manifest.files.map((file) => file.path), ['doc/test.md']);
  const changes = JSON.parse(fs.readFileSync(path.join(f.root, 'upstream-sync/changes.json'), 'utf8')).changes;
  assert.deepEqual(changes.find((file) => file.path === 'doc/test.md').affectedPages, []);
});

test('explicit initialization records a clean pinned baseline and rejects pending page candidates', async (t) => {
  const f = fixture(t, { files: ['doc/test.md', 'README.md'] });
  const sourcesPath = path.join(f.root, 'content/sources.json');
  const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
  sources.sourceCommit = newSha;
  fs.writeFileSync(sourcesPath, JSON.stringify(sources));
  const manifestPath = path.join(f.root, 'upstream-sync/manifest.json');
  const manifest = JSON.parse(f.manifest());
  manifest.commit = newSha;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  await syncUpstream({ ...f, write: true, initialize: true });
  assert.equal(JSON.parse(f.manifest()).files.length, 2);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.root, 'upstream-sync/changes.json'), 'utf8')).changes, []);
  assert.match(f.report(), /initial baseline/);
  assert.equal((await syncUpstream({ ...f, write: true })).written, false);
  sources.pages['content/docs/example.mdx'].candidateSourceCommit = newSha;
  fs.writeFileSync(sourcesPath, JSON.stringify(sources));
  const before = f.manifest();
  await assert.rejects(syncUpstream({ ...f, write: true, initialize: true }), /no pending/);
  assert.equal(f.manifest(), before);
});

const mapping = { id: 'hello', sourcePath: 'doc/test.md', heading: 'Hello World', codeBlockIndex: 0 };
const sourceWith = (code) => `## Hello World\n\n\`\`\`go\n${code}\n\`\`\`\n`;
const pageWith = (code) => `Introduction preserved.\n\n{/* upstream-snippet:hello:start */}\n\`\`\`go title="hello.xgo"\n${code}\n\`\`\`\n{/* upstream-snippet:hello:end */}\n\nConclusion preserved.\n`;

test('mapped snippets update real MDX and retain human-verified provenance', async (t) => {
  const oldContent = sourceWith('println "old"');
  const verifiedContent = sourceWith('println "verified"');
  const pageText = pageWith('println "verified"');
  const verifiedSha = 'c'.repeat(40);
  const f = fixture(t, { oldContent, verifiedContent, baselineHash: digest(oldContent), content: sourceWith('println "new"'), pageText, pageMetadata: { sourceCommit: verifiedSha, upstreamSnippets: [mapping] } });
  await syncUpstream({ ...f, write: true });
  assert.equal(fs.readFileSync(path.join(f.root, 'content/docs/example.mdx'), 'utf8'), pageWith('println "new"'));
  const sources = JSON.parse(fs.readFileSync(path.join(f.root, 'content/sources.json'), 'utf8'));
  assert.equal(sources.pages['content/docs/example.mdx'].sourceCommit, verifiedSha);
  assert.equal(sources.pages['content/docs/example.mdx'].candidateSourceCommit, newSha);
  assert.deepEqual(sources.pages['content/docs/example.mdx'].candidateChangedSources, ['doc/test.md']);
  assert(f.requests.some((url) => url.includes(`/${verifiedSha}/doc/test.md`)));
  const changes = JSON.parse(fs.readFileSync(path.join(f.root, 'upstream-sync/changes.json'), 'utf8'));
  assert.deepEqual(changes.candidateFiles, ['content/docs/example.mdx', 'content/sources.json']);
  assert.match(changes.candidateId, /^[a-f0-9]{16}$/);
  assert.equal((await syncUpstream({ ...f, write: true })).written, false);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.root, 'upstream-sync/changes.json'), 'utf8')).candidateId, changes.candidateId);
});

test('human-edited mapped snippets preserve all accepted output on conflict', async (t) => {
  const oldContent = sourceWith('println "old"');
  const pageText = pageWith('println "human edit"');
  const f = fixture(t, { oldContent, baselineHash: digest(oldContent), content: sourceWith('println "new"'), pageText, pageMetadata: { sourceCommit: oldSha, upstreamSnippets: [mapping] } });
  const before = f.manifest();
  const metadata = fs.readFileSync(path.join(f.root, 'content/sources.json'), 'utf8');
  await assert.rejects(syncUpstream({ ...f, write: true }), /editorial change/);
  assert.equal(f.manifest(), before);
  assert.equal(f.report(), 'preserve accepted report');
  assert.equal(fs.readFileSync(path.join(f.root, 'content/sources.json'), 'utf8'), metadata);
  assert.equal(fs.readFileSync(path.join(f.root, 'content/docs/example.mdx'), 'utf8'), pageText);
});

test('ambiguous source headings and invalid snippet boundaries fail', () => {
  assert.throws(() => sourceSnippet(sourceWith('old') + sourceWith('second'), mapping), /exactly once/);
  assert.throws(() => sourceSnippet('## Hello World\nNo example', mapping), /Missing/);
  assert.throws(() => replaceSnippet('No markers', mapping, 'old', 'new'), /markers/);
  assert.throws(() => replaceSnippet('{/* upstream-snippet:hello:end */}{/* upstream-snippet:hello:start */}', mapping, 'old', 'new'), /order/);
});

const candidate = 'chore/xgo-upstream-0123456789abcdef';
const laterCandidate = 'chore/xgo-upstream-fedcba9876543210';
const pr = (state, ref = candidate, merged_at = null) => ({ state, merged_at, head: { ref, repo: { full_name: 'example/fork' } } });

test('closed candidates suppress only their own fingerprint', () => {
  assert.equal(selectCandidateAction([pr('closed')], 'example/fork', candidate), 'already-reviewed');
  assert.equal(selectCandidateAction([pr('closed')], 'example/fork', laterCandidate), 'create');
});

test('merged and squash-merged candidate history permits a fresh branch', () => {
  assert.equal(selectCandidateAction([pr('closed', candidate, '2026-11-25')], 'example/fork', laterCandidate), 'create');
});

test('open review PRs remain untouched while newer candidates wait', () => {
  assert.equal(selectCandidateAction([pr('open')], 'example/fork', laterCandidate), 'wait-for-review');
  assert.equal(selectCandidateAction([pr('open', 'chore/xgo-upstream-sync')], 'example/fork', laterCandidate), 'wait-for-review');
});

test('candidate paths restrict copied documents to explicit site content', () => {
  assert.deepEqual(candidatePaths({ candidateId: '0123456789abcdef', candidateFiles: ['content/docs/getting-started/hello-world.mdx', 'content/sources.json'] }), ['upstream-sync', 'content/docs/getting-started/hello-world.mdx', 'content/sources.json']);
  for (const file of ['scripts/sync-upstream-pr.mjs', 'content/docs/../evil.mdx', '.github/workflows/pwn.yml']) assert.throws(() => candidatePaths({ candidateId: '0123456789abcdef', candidateFiles: [file] }), /unsupported/);
});

test('missing credentials fails before executing commands or reading candidates', () => {
  let calls = 0;
  assert.throws(() => createCandidatePr({ env: {}, runner: () => { calls += 1; } }), /Configure/);
  assert.equal(calls, 0);
});

test('PR candidates commit real documentation and resume a pushed branch without force pushes', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xgo-sync-git-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (args, cwd = root) => {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git(['init', '--initial-branch=main']);
  git(['config', 'user.name', 'Offline fixture']);
  git(['config', 'user.email', 'fixture@example.invalid']);
  fs.mkdirSync(path.join(root, 'content/docs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'upstream-sync'));
  fs.writeFileSync(path.join(root, 'content/docs/example.mdx'), 'Accepted example');
  fs.writeFileSync(path.join(root, 'content/sources.json'), '{}');
  fs.writeFileSync(path.join(root, 'upstream-sync/report.md'), 'Accepted report');
  git(['add', '.']);
  git(['commit', '-m', 'test: initialize offline fixture']);
  const baseSha = git(['rev-parse', 'HEAD']);
  fs.writeFileSync(path.join(root, 'content/docs/example.mdx'), 'Updated source example');
  fs.writeFileSync(path.join(root, 'content/sources.json'), '{"candidateSourceCommit":"test"}');
  fs.writeFileSync(path.join(root, 'upstream-sync/report.md'), 'Review candidate');
  fs.writeFileSync(path.join(root, 'upstream-sync/changes.json'), JSON.stringify({ candidateId: '0123456789abcdef', candidateFiles: ['content/docs/example.mdx', 'content/sources.json'] }));
  const env = { ...process.env, SYNC_FORK_REPOSITORY: 'example/fork', GITHUB_REPOSITORY: 'example/website', SYNC_BASE_BRANCH: 'main', SYNC_FORK_TOKEN: 'offline-fixture-token', GH_TOKEN: 'offline-fixture-token' };
  const calls = [];
  let publishedHead;
  let history = [];
  const runner = (command, args, options) => {
    calls.push({ command, args });
    const success = (stdout = '') => ({ status: 0, stdout, stderr: '' });
    if (command === 'gh') {
      if (args[1] === 'repos/example/fork') return success(JSON.stringify({ fork: true, parent: { full_name: 'example/website' } }));
      if (args[0] === 'api') return success(JSON.stringify([history]));
      return success();
    }
    if (args[0] === 'fetch') {
      return success();
    }
    if (args[0] === 'rev-parse' && args[1] === 'FETCH_HEAD') return success(baseSha);
    if (args[0] === 'ls-remote') return success(publishedHead ? `${publishedHead}\trefs/heads/${candidate}` : '');
    if (args.includes('push')) {
      assert(!args.some((arg) => arg.includes('force')));
      assert(args.includes('https://github.com/example/fork.git'));
      publishedHead = git(['rev-parse', 'HEAD'], options.cwd);
      return success();
    }
    return spawnSync(command, args, options);
  };
  assert.equal(createCandidatePr({ root, env, runner }).action, 'created');
  assert.equal(git(['show', `${publishedHead}:content/docs/example.mdx`]), 'Updated source example');
  assert.equal(git(['show', `${publishedHead}:content/sources.json`]), '{"candidateSourceCommit":"test"}');
  assert.equal(git(['rev-parse', `${publishedHead}^`]), baseSha);
  assert.equal(createCandidatePr({ root, env, runner }).action, 'created');
  assert.equal(calls.filter(({ args }) => args.includes('push')).length, 1);
  history = [pr('open')];
  const before = calls.filter(({ args }) => args.includes('worktree')).length;
  assert.equal(createCandidatePr({ root, env, runner }).action, 'wait-for-review');
  assert.equal(calls.filter(({ args }) => args.includes('worktree')).length, before);
});
