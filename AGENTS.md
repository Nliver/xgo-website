# XGo documentation site

This repository publishes XGo tutorials and a language reference. Write pages and interface text for the English edition in English. The site uses Next.js App Router, React, TypeScript, Fumadocs, and Tailwind CSS.

## Working locally

Use an existing checkout for questions and reviews. If the expected source files are missing, run `git status -sb` and `git worktree list` to locate the relevant checkout. Check its branch and local changes before editing.

Use npm with the latest stable Node.js release (minimum version 26.0.0). Run `npm ci` from the directory containing `package.json` to install dependencies, then `npm run dev` to preview the site at `/docs`. Preserve the lockfile. Edit source files and let the tools generate `.next/`, `.source/`, `coverage/`, and `next-env.d.ts`.

## Writing pages and examples

- Put pages in `content/docs/`. For a new page, supply a title and description, place it in the appropriate `meta.json` navigation list, and record its upstream sources in `content/sources.json`. When moving a page, update incoming links, navigation entries, and its source record together.
- Start each tutorial with a task the reader can complete. Give the required files, commands, and expected result. Keep detailed semantics and limitations in the reference page that owns the topic and link to it from the tutorial. Use the terms in `content/glossary.json`.
- For examples covered by `npm run check:examples`, give each source block a filename such as `title="hello.xgo"`. Follow each standalone XGo program with its expected output in a `text` block. For a mixed Go and XGo project, group its named source blocks before the shared output block. Verify any changed shell commands separately. Preserve paired `upstream-snippet` markers and their identifiers when editing synchronized excerpts.

## Verifying upstream changes

- Before drafting, translating, or syncing a technical claim, identify the revision that owns its behavior. Read the upstream prose alongside the implementation, regression test, or generated output at that revision. For ecosystem projects, use their own pinned tools and dependencies.
- Check every new or changed example, including reference pages. Run standalone programs directly from each edition's MDX with the documented toolchain and capture deterministic output for `npm run check:examples`. For fragments, generated code, intentional errors, and platform-specific examples, verify the claim against a minimal reproduction or a pinned implementation/test. Identify omitted context, expected diagnostics, or prerequisites where readers need them. Exercise changed shell sequences in a disposable workspace.
- If upstream prose conflicts with observed behavior, correct the English page and its translations together. Keep the original source mapping, record the supporting implementation or test and mark edited upstream content as `editorial`. In the review, report the revision, commands or source paths, observed results, and any remaining manual checks. Keep unverified claims in technical review.
- The example checker flags Go or XGo fences immediately followed by expected output when a filename is missing. For examples that require a separate tool or prepared module, put its exact command in the fence metadata (for example, `verify="go mod tidy && go run ."`), run it in the documented environment, and report the result. CI does not execute commands in this metadata.
- Run `node scripts/check-examples.mjs --review-files <page.mdx> ...` to locate Go and XGo fences outside the example runner, including fragments without output. The PR validation job lists their file and line numbers for changed pages. Review the affected excerpts before approval.
- Check language and toolchain claims against the revision recorded in `content/sources.json`. A page inherits the top-level `sourceCommit` unless it specifies its own. For new syntax, check the semantic implementation or run an example at that revision. For ecosystem tools such as LLGo or SPX, identify the tool, prerequisites, and source for the behavior described.
- A `candidateSourceCommit` identifies a revision awaiting review. Use `upstream-sync/report.md` to inspect the source changes, affected pages, and examples. After human technical and English editorial review, set each approved page's `sourceCommit` to its candidate revision, update `sourceCheckedAt`, and remove its `candidateSourceCommit` and `candidateChangedSources` fields.

## Customizing the site

- Trace the target page's imports and MDX component mapping in `components/mdx.tsx` to find the implementation to customize. For imports from `fumadocs-ui`, check the dependency mapping in `package.json`. It currently resolves to `@fumadocs/base-ui`.
- Routes live in `app/`, shared layout options in `lib/layout.shared.tsx`, and global styles in `app/global.css`. Pages, search, and Markdown exports share the content collection in `lib/source.ts`. For URL changes, check the route settings in `lib/shared.ts`, rewrites in `next.config.mjs`, and content negotiation in `proxy.ts`. Verify the HTML page, the explicit `.md` URL, and the page requested with `Accept: text/markdown`.
- Preview layout changes on the affected page at desktop and narrow widths. Exercise changed search, navigation, and copy controls with a keyboard. Give icon-only controls accessible names and keep keyboard focus visible. Check keyboard access to scrollable code blocks and reduced-motion preferences when changing those features.

## Fumadocs layout conventions

- Treat the official Fumadocs documentation as the source of truth for UI and layout behavior. Prefer the local checkout at /Users/admin/Desktop/Project/fumadocs/; use the official references when needed: https://www.fumadocs.dev/docs, https://www.fumadocs.dev/docs/ui, https://www.fumadocs.dev/docs/headless, https://www.fumadocs.dev/docs/mdx, and https://www.fumadocs.dev/docs/cli.
- Reuse Fumadocs HomeLayout, DocsLayout, Notebook, and their responsive behavior before considering custom UI. Prefer BaseLayoutProps configuration such as links, githubUrl, nav, and sidebar for site-specific choices.
- Use layout slots or custom components only when an official component and configuration cannot meet a documented requirement. Do not copy or rewrite Fumadocs navigation, sidebar drawers, search, language controls, theme controls, or responsive CSS.
- If a custom nav.component or layout slot is necessary, first read the relevant Fumadocs documentation and source, then preserve Fumadocs CSS variables, responsive states, keyboard behavior, and accessible names.
- Customize bilingual content and route data as needed, while keeping Fumadocs UI and layout behavior on the official implementation path. Prefer the local Fumadocs source checkout over assumptions from older versions.

## Choosing checks

| Change | Checks |
| --- | --- |
| Pages, links, navigation, terminology, or source records | `npm run check:docs` |
| Runnable tutorial examples or expected output | `npm run check:examples` with XGo built from the documented revision. Set `XGO_BIN` to select the executable. |
| Components, routes, or shared TypeScript | `npm run lint` and `npm run types:check`. Use `npm run test:site` for site behavior. |
| Documentation checker or upstream synchronization | `npm run test:docs` or `npm run test:sync`, respectively |
| MDX compilation, site configuration, or production routing | `npm run build` |
| Coverage collection or reporting | `npm run test:coverage` and inspect `coverage/lcov.info` |

For a behavior fix, identify a case that fails before the change. Add it to the relevant suite if existing tests miss it. Verify reader-facing fixes through the affected page, search, or export endpoint. Report which checks ran and identify any examples that still need verification with the documented XGo revision. See `package.json` for script definitions and `.github/workflows/ci.yml` for the full CI workflow.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
