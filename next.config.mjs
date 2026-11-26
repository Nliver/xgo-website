import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();
const localePrefixes = ['', '/zh-CN'];
const pageRoutes = localePrefixes.flatMap((locale) => [`${locale}/docs`, `${locale}/blog`]);
const movedDocs = [
  ['ecosystem/:project(llgo|ixgo|xbuilder|spx|mcp|yap|cobra)', ':project'],
  ['ecosystem/ixgo-host', 'ixgo/embedding'],
  ['ecosystem/spx-cli', 'spx/cli'],
  ['ecosystem/spx-animation-audio', 'spx/animation-audio'],
  ['interoperability/llgo', 'llgo/interoperability'],
  ['examples/llgo-demos', 'llgo/examples'],
  ['examples/:game(aircraft-war|flappy-calf|maze-play)', 'spx/examples/:game'],
];

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  experimental: { globalNotFound: true },
  async redirects() {
    return localePrefixes.flatMap((locale) => [
      ...['/:path*', '.md', '.txt'].map((suffix) => ({
        source: `${locale}/docs/blog${suffix}`,
        destination: `${locale}/blog${suffix}`,
        permanent: true,
      })),
      ...movedDocs.flatMap(([from, to]) => ['', '.md', '.txt'].map((suffix) => ({
        source: `${locale}/docs/${from}${suffix}`,
        destination: `${locale}/docs/${to}${suffix}`,
        permanent: true,
      }))),
    ]);
  },
  async rewrites() {
    return pageRoutes.flatMap((base) =>
      ['md', 'txt'].flatMap((extension) => [
        { source: `${base}.${extension}`, destination: `/llms.mdx${base}.md` },
        { source: `${base}/:path+.${extension}`, destination: `/llms.mdx${base}/:path+.md` },
      ]),
    );
  },
};

export default withMDX(config);
