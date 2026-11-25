# XGo Documentation

The XGo documentation site uses [Next.js](https://nextjs.org/) and
[Fumadocs](https://fumadocs.dev/). The first edition adapts professional English
content from the [XGo repository](https://github.com/goplus/xgo). The website
repository is [Nliver/xgo-website](https://github.com/Nliver/xgo-website).

## Development

Use the latest Node.js 22 LTS patch release to match CI and install the locked dependencies.

```bash
npm ci
npm run dev
```

Open http://localhost:3000 in your browser. Configure `NEXT_PUBLIC_SITE_URL` with
the public site origin in deployment environments. The deployment platform and
production domain remain to be selected.

## Validation

```bash
npm run lint
npm run types:check
npm run check:docs
npm run test:docs
npm run test:sync
npm run check:examples
npm run build
```

The example checker discovers programs throughout the documentation. Give each
runnable code block a filename, such as `title="scores.xgo"`, and follow it
with a `text` block containing the expected output. For a mixed Go/XGo
example, put both named source blocks before the output. Add the page to
`content/sources.json` so CI can select its compiler revision.

Install XGo locally or set `XGO_BIN` to an absolute executable path. CI groups
runnable pages by their verified and candidate source revisions, builds the
CLI using each revision's `cmd/go.mod`, and checks the output of each program.

## Content and source records

- `app/`, `components/`, and `lib/` contain the site implementation.
- `content/docs/` contains the English MDX pages.
- `content/sources.json` maps every page to its source revision and files.
- `content/glossary.json` contains terminology rules.
- `scripts/` contains validation and upstream synchronization tools.
- `upstream-sync/` contains the tracked source manifest and review candidates.

This edition follows a fixed XGo source snapshot and tracks 23 source files. Page source records retain
its Apache 2.0 license and copyright information. Content remains in technical
review until human technical and English editorial review is complete.

## Review upstream changes

Preview source changes from XGo without writing candidate files.

```bash
node scripts/sync-upstream.mjs
```

Generate the source manifest, affected-page index, review report, and source
diffs in `upstream-sync/`. Explicitly mapped code snippets can also produce
changes in the English MDX pages and candidate metadata in `content/sources.json`.

```bash
node scripts/sync-upstream.mjs --write
```

The committed baseline records the pinned source revision with no pending
changes. To initialize a baseline for a newly verified snapshot, use the
explicit initialization command. It requires the resolved upstream SHA, all
verified page revisions, and any existing baseline SHA to agree, with no pending
page candidates.

```bash
node scripts/sync-upstream.mjs --initialize --write
```

Use `--write` for routine synchronization.

The generator reads the source allowlist and page mappings, resolves upstream
to a full SHA, and checks history, file availability, and baseline hashes before
writing a candidate. `upstreamSnippets` mappings identify a source heading and
code block and a matching `upstream-snippet` marker in an MDX page. The generator
replaces that code fragment when the local fragment still matches its verified
source. A manual edit to the fragment stops generation for human review.

The verified `sourceCommit` stays unchanged. Affected pages receive
`candidateSourceCommit` and `candidateChangedSources`. A maintainer reviews the
source changes, updates the English prose and examples, runs validation, and
completes technical and editorial review. For each accepted page, set its
`sourceCommit` to the candidate SHA, update `sourceCheckedAt`, and remove both
candidate fields before merging.

The GitHub workflow supports manual dispatch, the `upstream-update`
`repository_dispatch` event, and a daily schedule. The upstream event sender
still requires configuration.

The current Git `origin` points to `Nliver/xgo-website`. A website `upstream`
remote and the dedicated synchronization fork have not been configured. To
enable draft PR creation, configure these repository values.

| Setting | Purpose |
| --- | --- |
| Variable `SYNC_FORK_REPOSITORY` | A direct fork of this website repository in `owner/repository` form |
| Variable `SYNC_APP_ID` | The GitHub App installed on the website repository and fork |
| Secret `SYNC_APP_PRIVATE_KEY` | The App private key stored in GitHub Secrets |

The App needs contents write access on the fork and pull requests write access
on the website repository. The workflow obtains separate installation tokens
for those operations. Each source candidate uses a fingerprinted fork branch,
`chore/xgo-upstream-<candidateId>`. When a synchronization PR is already open,
the workflow preserves it and waits for human review. Closing a PR suppresses
that exact candidate. A later candidate can open a new draft PR after the open
review is complete. Source deletion, history inconsistencies, and conflicting
branch contents require manual handling. The workflow executes trusted
default-branch code. PRs require human review and manual merge.

Remote CI and draft PR creation remain to be verified after repository
configuration.
