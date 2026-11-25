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

This edition follows a fixed XGo source snapshot and tracks 23 source files. Page source records retain
its Apache 2.0 license and copyright information. Content remains in technical
review until human technical and English editorial review is complete.
