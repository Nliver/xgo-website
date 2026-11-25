import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function selectCandidateAction(prs, fork, branch) {
  const related = prs.filter((pr) => pr.head?.repo?.full_name?.toLowerCase() === fork.toLowerCase() && /^chore\/xgo-upstream-(?:sync|[a-f0-9]{16})$/.test(pr.head.ref));
  if (related.some((pr) => pr.state === 'open')) return 'wait-for-review';
  if (related.some((pr) => pr.head.ref === branch && pr.state === 'closed')) return 'already-reviewed';
  return 'create';
}

export function candidatePaths(changes) {
  if (!/^[a-f0-9]{16}$/.test(changes.candidateId) || !Array.isArray(changes.candidateFiles)) throw new Error('Generate a current source candidate before creating a PR.');
  if (changes.candidateFiles.some((file) => typeof file !== 'string' || (file !== 'content/sources.json' && !/^content\/docs\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.mdx$/.test(file)))) throw new Error('Candidate contains an unsupported document path.');
  return ['upstream-sync', ...new Set(changes.candidateFiles)];
}

export function createCandidatePr({ root = process.cwd(), env = process.env, runner = spawnSync } = {}) {
  const fork = env.SYNC_FORK_REPOSITORY;
  const upstream = env.GITHUB_REPOSITORY;
  const base = env.SYNC_BASE_BRANCH;
  if (!/^[\w.-]+\/[\w.-]+$/.test(fork ?? '') || !/^[\w.-]+\/[\w.-]+$/.test(upstream ?? '') || fork.toLowerCase() === upstream.toLowerCase() || !base || !env.SYNC_FORK_TOKEN || !env.GH_TOKEN) throw new Error('Configure a separate fork repository, base branch, and GitHub App installation tokens.');
  const changes = JSON.parse(fs.readFileSync(path.join(root, 'upstream-sync/changes.json'), 'utf8'));
  const files = candidatePaths(changes);
  const branch = `chore/xgo-upstream-${changes.candidateId}`;
  const forkOwner = fork.split('/')[0];
  const auth = Buffer.from(`x-access-token:${env.SYNC_FORK_TOKEN}`).toString('base64');
  const gitEnv = { ...env, GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader', GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${auth}` };
  function run(command, args, options = {}) {
    const result = runner(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, env, ...options });
    if (result.status !== 0) throw new Error(`${command} ${args[0]} failed. ${result.stderr}`);
    return result.stdout.trim();
  }
  const forkDetails = JSON.parse(run('gh', ['api', `repos/${fork}`], { env: { ...env, GH_TOKEN: env.SYNC_FORK_TOKEN } }));
  if (!forkDetails.fork || forkDetails.parent?.full_name?.toLowerCase() !== upstream.toLowerCase()) throw new Error('SYNC_FORK_REPOSITORY must be a direct fork of this website repository.');
  // This fetch reads the website base. All pushes below target its distinct fork.
  run('git', ['fetch', '--no-tags', `https://github.com/${upstream}.git`, base]);
  const baseSha = run('git', ['rev-parse', 'FETCH_HEAD']);
  if (baseSha !== run('git', ['rev-parse', 'HEAD'])) throw new Error('Website base moved during generation. Rerun synchronization from its latest default branch.');
  const history = JSON.parse(run('gh', ['api', '--paginate', '--slurp', '--method', 'GET', `repos/${upstream}/pulls`, '-f', `base=${base}`, '-f', 'state=all', '-f', 'per_page=100'])).flat();
  const action = selectCandidateAction(history, fork, branch);
  if (action !== 'create') {
    console.log(action === 'wait-for-review' ? 'An open synchronization PR is awaiting human review. Its files and description were preserved.' : 'This exact source candidate was already reviewed or closed. A later candidate may open a new PR.');
    return { action, branch };
  }
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'xgo-sync-pr-'));
  const checkout = path.join(temporary, 'checkout');
  try {
    run('git', ['worktree', 'add', '--detach', checkout, baseSha]);
    const git = (args) => run('git', ['-c', 'core.hooksPath=/dev/null', ...args], { cwd: checkout, env: gitEnv });
    for (const file of files) {
      const source = path.join(root, file);
      if (fs.lstatSync(source).isSymbolicLink() || !fs.realpathSync(source).startsWith(`${fs.realpathSync(root)}${path.sep}`)) throw new Error('Candidate paths must remain inside the trusted checkout.');
      if (file === 'upstream-sync') fs.rmSync(path.join(checkout, file), { recursive: true, force: true });
      fs.cpSync(source, path.join(checkout, file), { recursive: true });
    }
    git(['add', '--', ...files]);
    if (!git(['diff', '--cached', '--name-only'])) {
      console.log('No source review candidate differs from the website baseline.');
      return { action: 'no-change', branch };
    }
    const expectedTree = git(['write-tree']);
    const forkUrl = `https://github.com/${fork}.git`;
    const head = run('git', ['ls-remote', '--heads', forkUrl, `refs/heads/${branch}`], { env: gitEnv }).split(/\s/)[0];
    if (head) {
      run('git', ['fetch', '--no-tags', forkUrl, `refs/heads/${branch}`], { env: gitEnv });
      if (git(['rev-parse', `${head}^{tree}`]) !== expectedTree) throw new Error('An existing candidate branch has different contents. Review it manually.');
    } else {
      git(['-c', 'user.name=XGo documentation sync', '-c', 'user.email=xgo-docs-sync@users.noreply.github.com', 'commit', '-m', 'chore(sync): prepare XGo documentation review']);
      git(['push', forkUrl, `HEAD:refs/heads/${branch}`]);
    }
    run('gh', ['pr', 'create', '--repo', upstream, '--base', base, '--head', `${forkOwner}:${branch}`, '--draft', '--title', 'chore(sync): review XGo documentation updates', '--body-file', path.join(root, 'upstream-sync/report.md')]);
    return { action: 'created', branch };
  } finally {
    runner('git', ['worktree', 'remove', '--force', checkout], { cwd: root, encoding: 'utf8' });
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    createCandidatePr();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
