# XGo Documentation

The XGo documentation site uses [Next.js](https://nextjs.org/) and
[Fumadocs](https://fumadocs.dev/). The first edition adapts professional English
content from the [XGo repository](https://github.com/goplus/xgo). The website
repository is [Nliver/xgo-website](https://github.com/Nliver/xgo-website).

## Development

Use the latest Node.js 22 LTS patch release and install the locked dependencies.

```bash
npm ci
npm run dev
```

Open http://localhost:3000 in your browser. Configure `NEXT_PUBLIC_SITE_URL` with
the public site origin in deployment environments. The deployment platform and
production domain remain to be selected.

## Content and source records

- `app/`, `components/`, and `lib/` contain the site implementation.
- `content/docs/` contains the English MDX pages.
- `content/sources.json` maps every page to its source revision and files.

This edition follows a fixed XGo source snapshot and tracks 23 source files. Page source records retain
its Apache 2.0 license and copyright information. Content remains in technical
review until human technical and English editorial review is complete.
