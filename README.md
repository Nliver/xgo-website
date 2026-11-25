# XGo Documentation

[![Documentation CI workflow](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)](.github/workflows/ci.yml)
[![Code coverage](https://codecov.io/gh/Nliver/xgo-website/branch/main/graph/badge.svg)](https://app.codecov.io/gh/Nliver/xgo-website)
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

This repository contains the tutorials, language reference, and website for
[XGo](https://github.com/goplus/xgo), a Go-compatible programming language.
The project's goal is to make these guides available in multiple languages.
The current edition is in English.

## Read the docs

- **New to XGo?** [Install XGo](content/docs/getting-started/installation.mdx) and [run your first program](content/docs/getting-started/hello-world.mdx).
- **Looking up syntax?** Browse the [language reference](content/docs/reference/language.mdx) or look up [strings, slices, maps, and structs](content/docs/reference/types.mdx).
- **Coming from Go?** [Build a project with Go and XGo](content/docs/interoperability/go.mdx).

## Run locally

Install Git and the latest stable Node.js release (26.0.0 or later). Node.js includes npm.
Clone the website repository and enter its root directory.

```sh
git clone https://github.com/Nliver/xgo-website.git
cd xgo-website
```

If you use nvm, run `nvm install node` and `nvm use node`. CI tests against Node.js 26.x.
Install the dependencies and start the development server.

```sh
npm ci
npm run dev
```

Open the [documentation](http://localhost:3000/docs). Edit an MDX file in
[content/docs](content/docs) to see your changes in the browser.

To preview a production build, stop the development server with Ctrl+C and run
the following commands from the same directory.

```sh
npm run build
npm start
```

## Architecture

The site is a TypeScript application built with Next.js and Fumadocs. Authors
write pages in MDX (Markdown with React components) and set their order with
`meta.json` files. Fumadocs loads the pages into one collection. The Next.js
App Router uses that collection to render the site, serve full-text search,
and export the same pages as Markdown. Each page links to the upstream files
and Git revision used to write it.

```text
xgo-website/
├── content/
│   ├── docs/                  # MDX tutorials, reference pages, and navigation
│   ├── glossary.json          # Documentation terminology
│   └── sources.json           # Upstream files and revisions for each page
├── app/                       # Next.js routes
│   ├── (home)/                # Landing page
│   ├── docs/                  # Documentation pages and layout
│   ├── api/search/            # Full-text search
│   └── llms.mdx/              # Per-page Markdown exports
├── components/mdx.tsx         # Components available in MDX
├── lib/source.ts              # Shared Fumadocs content collection
├── proxy.ts                   # HTML and Markdown content negotiation
├── scripts/                   # Content checks, examples, and upstream sync
├── tests/                     # Site tests and coverage reporting
├── upstream-sync/             # Upstream baseline and change reports
└── .github/workflows/         # CI and upstream review workflows
```

## Check a change

| Command | What it checks |
| --- | --- |
| `npm run check:docs` | Page structure, navigation, links, terminology, and source records. |
| `npm run check:examples` | Runs the tutorial programs with XGo and compares their output with the docs. Install XGo or set `XGO_BIN` to its executable for this check. |
| `npm run lint` and `npm run types:check` | ESLint rules and TypeScript types. |
| `npm run test:coverage` | Site and maintenance script tests. Writes the combined report to `coverage/lcov.info`. |

## License

This repository is licensed under the [Apache License 2.0](LICENSE).

## Core frameworks

The main framework versions are pinned in `package.json` and
[package-lock.json](package-lock.json).

- Next.js `16.4.6`
- React `19.3.1`
- Fumadocs Core and UI `16.19.7`, with Fumadocs MDX `15.6.4`
- Tailwind CSS `4.3.5`
