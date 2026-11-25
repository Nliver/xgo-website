import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  experimental: { globalNotFound: true },
  async rewrites() {
    return ['/docs', '/zh-CN/docs'].flatMap((base) =>
      ['md', 'txt'].flatMap((extension) => [
        { source: `${base}.${extension}`, destination: `/llms.mdx${base}.md` },
        { source: `${base}/:path+.${extension}`, destination: `/llms.mdx${base}/:path+.md` },
      ]),
    );
  },
};

export default withMDX(config);
