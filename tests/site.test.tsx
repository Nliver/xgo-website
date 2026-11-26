import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { PathnameContext, PathParamsContext, SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import EnglishRootLayout, { metadata as rootMetadata } from '@/app/(english)/layout';
import EnglishHomeLayout from '@/app/(english)/(home)/layout';
import EnglishDocsLayout from '@/app/(english)/docs/layout';
import ChineseRootLayout from '@/app/zh-CN/layout';
import ChineseHomeLayout from '@/app/zh-CN/(home)/layout';
import ChineseHomePage, { metadata as chineseHomeMetadata } from '@/app/zh-CN/(home)/page';
import ChineseDocsLayout from '@/app/zh-CN/docs/layout';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextRequest } from 'next/server';
import HomePage, { metadata as homeMetadata } from '@/app/(english)/(home)/page';
import EnglishNotFoundPage from '@/app/(english)/not-found';
import ChineseNotFoundPage from '@/app/zh-CN/not-found';
import EnglishPage, {
  generateMetadata as generateEnglishMetadata,
  generateStaticParams as generateEnglishStaticParams,
} from '@/app/(english)/docs/[[...slug]]/page';
import ChinesePage, {
  generateMetadata as generateChineseMetadata,
  generateStaticParams as generateChineseStaticParams,
} from '@/app/zh-CN/docs/[[...slug]]/page';
import { GET as getLlms } from '@/app/llms.txt/route';
import { GET as getFullLlms } from '@/app/llms-full.txt/route';
import { GET as getMarkdown, generateStaticParams as markdownParams } from '@/app/llms.mdx/[...path]/route';
import { GET as getSearch } from '@/app/api/search/route';
import { GET as getEnglishImage, generateStaticParams as englishImageParams } from '@/app/og/docs/[...slug]/route';
import { GET as getChineseImage, generateStaticParams as chineseImageParams } from '@/app/zh-CN/og/docs/[...slug]/route';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import proxy from '@/proxy';
import { source } from '@/lib/source';
import { getPageSources, siteRepositoryUrl, upstreamUrl } from '@/lib/upstream';
import { appName, getPageImageUrl, siteOrigin } from '@/lib/shared';
import { cn } from '@/lib/cn';
import { getMDXComponents, useMDXComponents } from '@/components/mdx';
import manifest from '@/content/sources.json';
import { baseOptions } from '@/lib/layout.shared';

const pageProps = (slug?: string[]) => ({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({}) });

function renderSite(children: ReactNode, pathname: string, searchParams = new URLSearchParams()) {
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
          <SearchParamsContext value={searchParams}>
            {children}
          </SearchParamsContext>
        </PathParamsContext>
      </PathnameContext>
    </AppRouterContext>,
  );
}

function expectFumadocsLayoutOptions(locale: 'en' | 'zh-CN') {
  const options = baseOptions(locale);
  expect(options.githubUrl).toBe(siteRepositoryUrl);
  expect(options.nav?.url).toBe(locale === 'zh-CN' ? '/zh-CN' : '/');
  expect(options.links).toEqual(expect.arrayContaining([
    expect.objectContaining({ text: locale === 'zh-CN' ? '文档' : 'Docs', url: locale === 'zh-CN' ? '/zh-CN/docs' : '/docs' }),
    expect.objectContaining({ label: 'Discord', url: 'https://discord.gg/mYjWCJDcAr', type: 'icon' }),
    expect.objectContaining({ label: 'X', url: 'https://x.com/xgodev', type: 'icon' }),
  ]));
}

function expectDesktopSidebar(html: string, locale: 'en' | 'zh-CN') {
  const collapseLabel = locale === 'zh-CN' ? '折叠侧栏' : 'Collapse Sidebar';
  const sidebar = [...html.matchAll(/<aside\b([^>]*)>([\s\S]*?)<\/aside>/g)]
    .find(([, , content]) => content.includes(`aria-label="${collapseLabel}"`));
  expect(sidebar).toBeDefined();

  const [, sidebarAttributes = '', sidebarContent = ''] = sidebar ?? [];
  const sidebarId = sidebarAttributes.match(/\bid="([^"]+)"/)?.[1];
  expect(sidebarId).toBeTruthy();
  const button = [...sidebarContent.matchAll(/<button\b[^>]*>/g)]
    .map(([tag]) => tag)
    .find((tag) => tag.includes(`aria-label="${collapseLabel}"`));
  expect(button).toContain(`aria-controls="${sidebarId}"`);
  expect(button).toContain('aria-expanded="true"');
}

describe('site navigation and metadata', () => {
  it('renders the actual home page with a visible program and working documentation links', () => {
    const html = renderToStaticMarkup(<HomePage />);
    expect(html).toContain('Programming with');
    expect(html).toContain('Hello world');
    const links = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    expect(links).toContain('/docs/getting-started/installation');
    expect(links).toContain('/docs');
    const pages = new Set(source.getPages('en').map((page) => page.url));
    for (const link of links) expect(pages.has(link), `${link} must resolve to a real document`).toBe(true);
    expect(homeMetadata.alternates?.canonical).toBe('/');
    expect(homeMetadata.alternates?.languages).toMatchObject({ en: '/', 'zh-CN': '/zh-CN' });
  });

  it('renders the Chinese home page with localized metadata and documentation links', () => {
    const html = renderSite(
      <ChineseRootLayout params={Promise.resolve({})}>
        <ChineseHomeLayout params={Promise.resolve({})}><ChineseHomePage /></ChineseHomeLayout>
      </ChineseRootLayout>,
      '/zh-CN',
    );
    expect(html).toContain('<html lang="zh-CN"');
    expect(html).toContain('安装 XGo');
    expect(html).toContain('href="#main-content"');
    expectFumadocsLayoutOptions('zh-CN');
    expect(html).toContain('aria-label="展开或收起菜单"');
    const pages = new Set(source.getPages('zh-CN').map((page) => page.url));
    const links = renderToStaticMarkup(<ChineseHomePage />).matchAll(/href="([^"]+)"/g);
    for (const [, link] of links) expect(pages.has(link), `${link} must resolve to a Chinese document`).toBe(true);
    expect(chineseHomeMetadata.alternates?.canonical).toBe('/zh-CN');
    expect(chineseHomeMetadata.alternates?.languages).toMatchObject({ en: '/', 'zh-CN': '/zh-CN' });
  });

  it('renders the root and home layouts with English metadata and the skip link', () => {
    const html = renderSite(
      <EnglishRootLayout params={Promise.resolve({})}>
        <EnglishHomeLayout params={Promise.resolve({})}><HomePage /></EnglishHomeLayout>
      </EnglishRootLayout>,
      '/',
    );
    expect(html).toContain('<html lang="en"');
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('id="main-content"');
    expectFumadocsLayoutOptions('en');
    expect(html).toContain('aria-label="Toggle Menu"');
    expect(new URL(rootMetadata.metadataBase!).origin).toBe(siteOrigin);
  });

  it('provides a recovery link on the actual 404 page', () => {
    const english = renderToStaticMarkup(<EnglishNotFoundPage />);
    const chinese = renderToStaticMarkup(<ChineseNotFoundPage />);
    expect(english).toContain('Page not found');
    expect(english).toContain('href="/docs"');
    expect(chinese).toContain('未找到页面');
    expect(chinese).toContain('href="/zh-CN/docs"');
  });

  it('builds stable localized image URLs without mutating page slugs', () => {
    const page = { slugs: ['tutorials', 'functions'] };
    expect(getPageImageUrl(page)).toEqual({ segments: ['tutorials', 'functions', 'image.png'], url: '/og/docs/tutorials/functions/image.png' });
    expect(page.slugs).toEqual(['tutorials', 'functions']);
    expect(getPageImageUrl({ slugs: [] }).url).toBe('/og/docs/image.png');
    expect(getPageImageUrl({ slugs: ['getting-started', 'hello-world'], locale: 'zh-CN' }).url)
      .toBe('/zh-CN/og/docs/getting-started/hello-world/image.png');
  });

  it('renders the Simplified Chinese document shell with the correct page language', async () => {
    const page = source.getPage(['getting-started', 'hello-world'], 'zh-CN')!;
    const rendered = await ChinesePage(pageProps(page.slugs));
    const html = renderSite(
      <ChineseRootLayout params={Promise.resolve({})}>
        <ChineseDocsLayout params={Promise.resolve({})}>{rendered}</ChineseDocsLayout>
      </ChineseRootLayout>,
      page.url,
    );
    expect(html).toContain('<html lang="zh-CN"');
    expect(html).toContain('你的第一个 XGo 程序');
    expectFumadocsLayoutOptions('zh-CN');
    expectDesktopSidebar(html, 'zh-CN');
  });

  it('lists every real document in the sitemap and the sitemap in robots', () => {
    expect(sitemap().map((entry) => entry.url).sort()).toEqual([
      `${siteOrigin}/`,
      `${siteOrigin}/zh-CN`,
      ...source.getPages().map((page) => new URL(page.url, siteOrigin).href),
    ].sort());
    expect(robots()).toEqual({ rules: { userAgent: '*', allow: '/' }, sitemap: `${siteOrigin}/sitemap.xml` });
  });
});

describe('actual documentation content and provenance', () => {
  it('compiles each localized MDX page and exposes the M1 route params', async () => {
    expect(source.getPages().length).toBe(Object.keys(manifest.pages).length);
    const englishSlugs = source.getPages('en').map((page) => page.slugs.join('/')).sort();
    const chineseSlugs = source.getPages('zh-CN').map((page) => page.slugs.join('/')).sort();
    expect(chineseSlugs).toEqual(englishSlugs);
    expect(generateEnglishStaticParams()).toEqual(source.getPages('en').map((page) => ({ slug: page.slugs })));
    expect(generateChineseStaticParams()).toEqual(source.getPages('en').map((page) => ({ slug: page.slugs })));
    for (const page of source.getPages()) {
      expect(typeof page.data.body).toBe('function');
      expect((await page.data.getText('processed')).trim().length).toBeGreaterThan(0);
      const localized = page.locale === 'zh-CN';
      expect(await (localized ? ChinesePage : EnglishPage)(pageProps(page.slugs))).toBeTruthy();
      const metadata = await (localized ? generateChineseMetadata : generateEnglishMetadata)(pageProps(page.slugs));
      expect(metadata.description).toBe(page.data.description);
      expect(metadata.alternates?.canonical).toBe(page.url);
      expect(metadata.openGraph).toMatchObject({ type: 'article', url: page.url, images: [getPageImageUrl(page).url] });
      const siteName = localized ? 'XGo 文档' : appName;
      expect(metadata.title).toEqual(page.data.title === siteName ? { absolute: siteName } : page.data.title);
      expect(metadata.alternates?.languages).toEqual({
        en: source.getPage(page.slugs, 'en')!.url,
        'zh-CN': source.getPage(page.slugs, 'zh-CN')!.url,
      });
    }
  });

  it('renders a real MDX document with its source disclosure inside the actual layouts', async () => {
    const page = source.getPage(['getting-started', 'hello-world'])!;
    const rendered = await EnglishPage(pageProps(page.slugs));
    const html = renderSite(
      <EnglishRootLayout params={Promise.resolve({})}>
        <EnglishDocsLayout params={Promise.resolve({})}>{rendered}</EnglishDocsLayout>
      </EnglishRootLayout>,
      page.url,
    );
    expect(html).toContain(page.data.title);
    expectFumadocsLayoutOptions('en');
    expectDesktopSidebar(html, 'en');
    expect(html).toContain('Sources for this page');
    expect(html).toContain('Hello world');
    expect(html).toContain(getPageSources(page.path).files[0].url);
    expect(html).toContain('Apache-2.0');
  });

  it('redirects a missing Chinese translation to the English original', async () => {
    const slug = ['tutorials', 'functions'];
    const redirect = { digest: expect.stringContaining('/docs/tutorials/functions?translation=zh-CN') };
    const getPage = source.getPage.bind(source);
    using missingTranslation = vi.spyOn(source, 'getPage').mockImplementation((slugs, options) =>
      options === 'zh-CN' && slugs?.join('/') === slug.join('/') ? undefined : getPage(slugs, options),
    );
    await expect(ChinesePage(pageProps(slug))).rejects.toMatchObject(redirect);
    await expect(generateChineseMetadata(pageProps(slug))).rejects.toMatchObject(redirect);

    const rendered = await EnglishPage(pageProps(slug));
    const html = renderSite(
      <EnglishRootLayout params={Promise.resolve({})}>
        <EnglishDocsLayout params={Promise.resolve({})}>{rendered}</EnglishDocsLayout>
      </EnglishRootLayout>,
      '/docs/tutorials/functions',
      new URLSearchParams('translation=zh-CN'),
    );
    expect(html).toContain('此页暂未提供简体中文译文');
    expect(html).toMatch(/href="\/docs\/tutorials\/functions">继续阅读英文原文/);
    expect(html).toMatch(/href="\/zh-CN\/docs">浏览中文文档/);
    expect(missingTranslation).toHaveBeenCalledWith(slug, 'zh-CN');
  });

  it('offers the translation when an old fallback link points to a translated article', async () => {
    const slug = ['getting-started', 'hello-world'];
    const html = renderSite(
      <EnglishRootLayout params={Promise.resolve({})}>
        <EnglishDocsLayout params={Promise.resolve({})}>{await EnglishPage(pageProps(slug))}</EnglishDocsLayout>
      </EnglishRootLayout>,
      '/docs/getting-started/hello-world',
      new URLSearchParams('translation=zh-CN'),
    );
    expect(html).not.toContain('此页暂未提供简体中文译文');
    expect(html).toContain('阅读本页的简体中文版');
    expect(html).toContain('href="/zh-CN/docs/getting-started/hello-world"');
  });

  it('rejects unknown document pages and metadata with Next.js notFound', async () => {
    const unknownEnglishPage = await EnglishPage(pageProps(['missing-page']));
    expect(() => renderToStaticMarkup(unknownEnglishPage)).toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    await expect(generateEnglishMetadata(pageProps(['missing-page']))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    await expect(ChinesePage(pageProps(['missing-page']))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
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
    for (const page of source.getPages()) {
      const param = { path: decodeURI(page.url).slice(1).split('/') };
      param.path[param.path.length - 1] += '.md';
      expect(params).toContainEqual(param);
      const response = await getMarkdown(new Request('http://localhost'), { params: Promise.resolve(param) });
      expect(response.status).toBe(200);
      expect(await response.text()).toContain(`# ${page.data.title} (${page.url})`);
    }
    expect((await getMarkdown(new Request('http://localhost'), { params: Promise.resolve({ path: ['docs', 'absent.md'] }) })).status).toBe(404);
    expect((await getMarkdown(new Request('http://localhost'), { params: Promise.resolve({ path: ['zh-CN', 'docs', 'absent.md'] }) })).status).toBe(404);
  });

  it('pre-renders the English Markdown redirect when a translation is missing', async () => {
    // The route snapshots its redirects at import time.
    vi.resetModules();
    const { source: fallbackSource } = await import('@/lib/source');
    const getPage = fallbackSource.getPage.bind(fallbackSource);
    using missingTranslation = vi.spyOn(fallbackSource, 'getPage').mockImplementation((slugs, options) =>
      options === 'zh-CN' && slugs?.join('/') === 'tutorials/functions' ? undefined : getPage(slugs, options),
    );
    const { GET, generateStaticParams } = await import('@/app/llms.mdx/[...path]/route');
    const path = ['zh-CN', 'docs', 'tutorials', 'functions.md'];
    expect(await generateStaticParams()).toContainEqual({ path });
    const response = await GET(new Request('http://localhost'), { params: Promise.resolve({ path }) });
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('/docs/tutorials/functions.md');
    expect(missingTranslation).toHaveBeenCalledWith(['tutorials', 'functions'], 'zh-CN');
  });

  it('filters the actual documentation search index by language', async () => {
    const english = await getSearch(new Request('http://localhost/api/search?query=control+flow'));
    expect(english.status).toBe(200);
    const englishResults = await english.json();
    expect(englishResults.length).toBeGreaterThan(0);
    expect(englishResults[0].url).toBe('/docs/tutorials/control-flow');
    expect(englishResults.every((result: { url: string }) => /^\/docs(?:\/|#|$)/.test(result.url))).toBe(true);

    const chinese = await getSearch(new Request('http://localhost/api/search?query=%E7%AC%AC%E4%B8%80%E4%B8%AA&locale=zh-CN'));
    expect(chinese.status).toBe(200);
    const chineseResults = await chinese.json();
    expect(chineseResults.length).toBeGreaterThan(0);
    expect(chineseResults.every((result: { url: string }) => /^\/zh-CN\/docs(?:\/|#|$)/.test(result.url))).toBe(true);

    const englishOnly = await getSearch(new Request('http://localhost/api/search?query=functions&locale=zh-CN'));
    expect(await englishOnly.json()).toEqual([]);
    const unmatched = await getSearch(new Request('http://localhost/api/search?query=zzzxgononexistent987654321'));
    expect(await unmatched.json()).toEqual([]);
  });

  it('generates localized image paths for all real pages and rejects unknown pages', async () => {
    expect(englishImageParams()).toEqual(source.getPages('en').map((page) => ({ slug: [...page.slugs, 'image.png'] })));
    expect(chineseImageParams()).toEqual(source.getPages('zh-CN').map((page) => ({ slug: [...page.slugs, 'image.png'] })));
    await expect(getEnglishImage(new Request('http://localhost'), { params: Promise.resolve({ slug: ['absent', 'image.png'] }) })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    await expect(getChineseImage(new Request('http://localhost'), { params: Promise.resolve({ slug: ['absent', 'image.png'] }) })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
  });
});

describe('request negotiation', () => {
  it('sets the proxy Vary header when rewriting Markdown requests', () => {
    const response = proxy(new NextRequest('http://localhost/docs/tutorials/functions', { headers: { Accept: 'text/markdown' } }));
    expect(response.headers.get('x-middleware-rewrite')).toBe('http://localhost/llms.mdx/docs/tutorials/functions.md');
    expect(response.headers.get('Vary')).toBe('Accept');

    const chinese = proxy(new NextRequest('http://localhost/zh-CN/docs/getting-started/hello-world', { headers: { Accept: 'text/markdown' } }));
    expect(chinese.headers.get('x-middleware-rewrite')).toBe('http://localhost/llms.mdx/zh-CN/docs/getting-started/hello-world.md');
    expect(chinese.headers.get('Vary')).toBe('Accept');
  });

  it.each([
    ['/docs/tutorials/functions', 'text/html'],
    ['/docs/tutorials/functions.md', 'text/markdown'],
    ['/docs/tutorials/functions.txt', 'text/markdown'],
    ['/zh-CN/docs/getting-started/hello-world.md', 'text/markdown'],
    ['/', 'text/markdown'],
  ])('passes through %s requested as %s', (pathname, accept) => {
    const response = proxy(new NextRequest(`http://localhost${pathname}`, { headers: { Accept: accept } }));
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.has('x-middleware-rewrite')).toBe(false);
  });
});
