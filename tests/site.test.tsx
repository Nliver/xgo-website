import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { PathnameContext, PathParamsContext, SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import RootLayout, { metadata as rootMetadata } from '@/app/layout';
import HomeLayout from '@/app/(home)/layout';
import DocsLayout from '@/app/docs/layout';
import { baseOptions } from '@/lib/layout.shared';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextRequest } from 'next/server';
import HomePage, { metadata as homeMetadata } from '@/app/(home)/page';
import NotFoundPage from '@/app/not-found';
import Page, { generateMetadata, generateStaticParams } from '@/app/docs/[[...slug]]/page';
import { GET as getLlms } from '@/app/llms.txt/route';
import { GET as getFullLlms } from '@/app/llms-full.txt/route';
import { GET as getMarkdown, generateStaticParams as markdownParams } from '@/app/llms.mdx/[...path]/route';
import { GET as getSearch } from '@/app/api/search/route';
import { GET as getImage, generateStaticParams as imageParams } from '@/app/og/docs/[...slug]/route';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import proxy from '@/proxy';
import { source } from '@/lib/source';
import { getPageSources, upstreamUrl } from '@/lib/upstream';
import { appName, getPageImageUrl, siteOrigin } from '@/lib/shared';
import { cn } from '@/lib/cn';
import { getMDXComponents, useMDXComponents } from '@/components/mdx';
import manifest from '@/content/sources.json';

const pageProps = (slug?: string[]) => ({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({}) });

function renderSite(children: ReactNode, pathname: string) {
  const router = {
    bfcacheId: 'site-test',
    back() {},
    forward() {},
    refresh() {},
    hmrRefresh() {},
    push() {},
    replace() {},
    prefetch() {},
  };
  return renderToStaticMarkup(
    <AppRouterContext value={router}>
      <PathnameContext value={pathname}>
        <PathParamsContext value={{}}>
          <SearchParamsContext value={new URLSearchParams()}>
            {children}
          </SearchParamsContext>
        </PathParamsContext>
      </PathnameContext>
    </AppRouterContext>,
  );
}

describe('site navigation and metadata', () => {
  it('renders the actual home page with a visible program and working documentation links', () => {
    const html = renderToStaticMarkup(<HomePage />);
    expect(html).toContain('Programming with');
    expect(html).toContain('Hello world');
    const links = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    expect(links).toContain('/docs/getting-started/installation');
    expect(links).toContain('/docs');
    const pages = new Set(source.getPages().map((page) => page.url));
    for (const link of links) expect(pages.has(link), `${link} must resolve to a real document`).toBe(true);
    expect(homeMetadata.alternates?.canonical).toBe('/');
  });

  it('renders the root and home layouts with English metadata and the skip link', () => {
    const html = renderSite(
      <RootLayout params={Promise.resolve({})}>
        <HomeLayout params={Promise.resolve({})}><HomePage /></HomeLayout>
      </RootLayout>,
      '/',
    );
    expect(html).toContain('<html lang="en"');
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('id="main-content"');
    expect(html).toContain('href="https://github.com/goplus/xgo"');
    expect(baseOptions().githubUrl).toBe(upstreamUrl);
    expect(new URL(rootMetadata.metadataBase!).origin).toBe(siteOrigin);
  });

  it('provides a recovery link on the actual 404 page', () => {
    const html = renderToStaticMarkup(<NotFoundPage />);
    expect(html).toContain('Page not found');
    expect(html).toContain('href="/docs"');
  });

  it('builds stable image URLs without mutating page slugs', () => {
    const page = { slugs: ['tutorials', 'functions'] };
    expect(getPageImageUrl(page)).toEqual({ segments: ['tutorials', 'functions', 'image.png'], url: '/og/docs/tutorials/functions/image.png' });
    expect(page.slugs).toEqual(['tutorials', 'functions']);
    expect(getPageImageUrl({ slugs: [] }).url).toBe('/og/docs/image.png');
  });

  it('lists every real document in the sitemap and the sitemap in robots', () => {
    expect(sitemap().map((entry) => entry.url)).toEqual([
      `${siteOrigin}/`,
      ...source.getPages().map((page) => new URL(page.url, siteOrigin).href),
    ]);
    expect(robots()).toEqual({ rules: { userAgent: '*', allow: '/' }, sitemap: `${siteOrigin}/sitemap.xml` });
  });
});

describe('actual documentation content and provenance', () => {
  it('compiles each actual MDX page and exposes it through static route params', async () => {
    expect(source.getPages().length).toBe(Object.keys(manifest.pages).length);
    expect(generateStaticParams()).toEqual(source.generateParams());
    for (const page of source.getPages()) {
      expect(typeof page.data.body).toBe('function');
      expect((await page.data.getText('processed')).trim().length).toBeGreaterThan(0);
      expect(await Page(pageProps(page.slugs))).toBeTruthy();
      const metadata = await generateMetadata(pageProps(page.slugs));
      expect(metadata.description).toBe(page.data.description);
      expect(metadata.alternates?.canonical).toBe(page.url);
      expect(metadata.openGraph).toMatchObject({ type: 'article', url: page.url, images: [getPageImageUrl(page).url] });
      expect(metadata.title).toEqual(page.data.title === appName ? { absolute: appName } : page.data.title);
    }
  });

  it('renders a real MDX document with its source disclosure inside the actual layouts', async () => {
    const page = source.getPage(['getting-started', 'hello-world'])!;
    const rendered = await Page(pageProps(page.slugs));
    const html = renderSite(
      <RootLayout params={Promise.resolve({})}>
        <DocsLayout params={Promise.resolve({})}>{rendered}</DocsLayout>
      </RootLayout>,
      page.url,
    );
    expect(html).toContain(page.data.title);
    expect(html).toContain('Sources for this page');
    expect(html).toContain('Hello world');
    expect(html).toContain(getPageSources(page.path).files[0].url);
    expect(html).toContain('Apache-2.0');
  });

  it('rejects unknown document pages and metadata with Next.js notFound', async () => {
    await expect(Page(pageProps(['missing-page']))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    await expect(generateMetadata(pageProps(['missing-page']))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
  });

  it('links every page to its pinned upstream source and license', () => {
    for (const page of source.getPages()) {
      const sources = getPageSources(page.path);
      expect(sources.files.length).toBeGreaterThan(0);
      for (const file of sources.files) expect(file.url).toMatch(/^https:\/\/github.com\/goplus\/xgo\/blob\/[a-f0-9]{40}\//);
      expect(sources.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const records: Record<string, { sourcePath: string; sourceCommit?: string }> = manifest.pages;
      const commit = records[`content/docs/${page.path}`].sourceCommit ?? manifest.sourceCommit;
      const licensePath = manifest.licensePath.split('/').map(encodeURIComponent).join('/');
      expect(sources.licenseUrl).toBe(`${upstreamUrl}/blob/${commit}/${licensePath}`);
      expect(sources.license).toBe('Apache-2.0');
    }
    expect(() => getPageSources('missing.mdx')).toThrow('Missing source record');
  });

  it('preserves the MDX component defaults when a caller overrides one component', () => {
    const CustomLink = () => <span>custom link</span>;
    const defaults = getMDXComponents();
    expect(getMDXComponents({ a: CustomLink })).toEqual({ ...defaults, a: CustomLink });
    expect(useMDXComponents).toBe(getMDXComponents);
    expect(cn('p-2', false, 'font-bold')).toContain('font-bold');
  });
});

describe('actual route responses', () => {
  it('serves an LLM index and full content from the real source collection', async () => {
    const index = await getLlms();
    expect(index.status).toBe(200);
    const indexText = await index.text();
    for (const page of source.getPages()) expect(indexText).toContain(page.url);
    const full = await getFullLlms();
    expect(full.status).toBe(200);
    const fullText = await full.text();
    for (const page of source.getPages()) expect(fullText).toContain(`# ${page.data.title} (${page.url})`);
  });

  it('serves every generated Markdown route and returns 404 for missing content', async () => {
    const params = await markdownParams();
    expect(params.length).toBe(source.getPages().length);
    for (const param of params) {
      const response = await getMarkdown(new Request('http://localhost'), { params: Promise.resolve(param) });
      expect(response.status).toBe(200);
      expect(await response.text()).toMatch(/^# /);
    }
    expect((await getMarkdown(new Request('http://localhost'), { params: Promise.resolve({ path: ['docs', 'absent.md'] }) })).status).toBe(404);
  });

  it('searches the actual documentation index and handles an unmatched query', async () => {
    const matched = await getSearch(new Request('http://localhost/api/search?query=functions'));
    expect(matched.status).toBe(200);
    const results = await matched.json();
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((result: { url: string }) => result.url.startsWith('/docs/'))).toBe(true);
    const unmatched = await getSearch(new Request('http://localhost/api/search?query=zzzxgononexistent987654321'));
    expect(await unmatched.json()).toEqual([]);
  });

  it('generates image paths for all real pages and rejects unknown pages', async () => {
    expect(imageParams()).toEqual(source.getPages().map((page) => ({ slug: [...page.slugs, 'image.png'] })));
    await expect(getImage(new Request('http://localhost'), { params: Promise.resolve({ slug: ['absent', 'image.png'] }) })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
  });
});

describe('request negotiation', () => {
  it('sets the proxy Vary header when rewriting Markdown requests', () => {
    const response = proxy(new NextRequest('http://localhost/docs/tutorials/functions', { headers: { Accept: 'text/markdown' } }));
    expect(response.headers.get('x-middleware-rewrite')).toBe('http://localhost/llms.mdx/docs/tutorials/functions.md');
    expect(response.headers.get('Vary')).toBe('Accept');
  });

  it.each([
    ['/docs/tutorials/functions', 'text/html'],
    ['/docs/tutorials/functions.md', 'text/markdown'],
    ['/docs/tutorials/functions.txt', 'text/markdown'],
    ['/', 'text/markdown'],
  ])('passes through %s requested as %s', (pathname, accept) => {
    const response = proxy(new NextRequest(`http://localhost${pathname}`, { headers: { Accept: accept } }));
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.has('x-middleware-rewrite')).toBe(false);
  });
});
