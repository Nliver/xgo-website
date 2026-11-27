import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { PathnameContext, PathParamsContext, SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import EnglishRootLayout, { metadata as rootMetadata } from '@/app/(english)/layout';
import EnglishHomeLayout from '@/app/(english)/(home)/layout';
import EnglishDocsLayout from '@/app/(english)/docs/layout';
import BlogPage, {
  generateMetadata as generateBlogMetadata,
  generateStaticParams as generateBlogStaticParams,
} from '@/app/(english)/(home)/blog/[[...slug]]/page';
import ChineseBlogPage, { generateMetadata as generateChineseBlogMetadata } from '@/app/zh-CN/(home)/blog/[[...slug]]/page';
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
import { getDocsPageTree, source } from '@/lib/source';
import { getPageEditUrl, getPageSources, siteRepositoryUrl, upstreamUrl } from '@/lib/upstream';
import { appName, getPageImageUrl, siteOrigin } from '@/lib/shared';
import { cn } from '@/lib/cn';
import { getMDXComponents, useMDXComponents } from '@/components/mdx';
import { ContentPageFooter } from '@/components/docs-page';
import manifest from '@/content/sources.json';
import { baseOptions } from '@/lib/layout.shared';
import { getLayoutTabs } from 'fumadocs-ui/layouts/shared';
import { flattenTree } from 'fumadocs-core/page-tree';

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
  it('lists every article at /blog and keeps Blog out of the documentation sidebars', async () => {
    const html = renderSite(
      <EnglishRootLayout params={Promise.resolve({})}>
        <EnglishHomeLayout params={Promise.resolve({})}>{await BlogPage(pageProps())}</EnglishHomeLayout>
      </EnglishRootLayout>,
      '/blog',
    );
    expect(html).toContain('<h1');
    expect(html).toContain('id="main-content"');
    expect(html).not.toContain('aria-label="Collapse Sidebar"');
    const posts = source.getPages('en').filter((page) => page.slugs[0] === 'blog' && page.slugs.length > 1);
    expect(posts.length).toBeGreaterThan(0);
    for (const post of posts) {
      expect(post.url).toMatch(/^\/blog\//);
      expect(html).toContain(`href="${post.url}"`);
    }
    for (const locale of ['en', 'zh-CN']) {
      expect(getDocsPageTree(locale).children.some((node) => node.type === 'folder' && node.$ref?.folder === 'blog')).toBe(false);
    }
  });
  it.each(['en', 'zh-CN'])('gives each project a sidebar rooted at its own guide in %s', (locale) => {
    const tabs = getLayoutTabs(getDocsPageTree(locale));
    const docs = locale === 'en' ? '/docs' : '/zh-CN/docs';
    expect(tabs[0]?.url).toBe(docs);
    for (const slug of ['llgo', 'ixgo', 'xbuilder', 'spx']) {
      const root = tabs.find((tab) => tab.url === `${docs}/${slug}`)?.$folder;
      expect(root, slug).toBeDefined();
      const pages = flattenTree(root!.children);
      expect(pages.every((page) => page.url === `${docs}/${slug}` || page.url.startsWith(`${docs}/${slug}/`))).toBe(true);
    }
    const main = flattenTree(tabs[0].$folder!.children);
    expect(main.some((page) => page.url === `${docs}/getting-started/installation`)).toBe(true);
    expect(main.some((page) => page.url.startsWith(`${docs}/spx`))).toBe(false);
  });

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
    expect(englishSlugs).toEqual(expect.arrayContaining(chineseSlugs));
    expect(chineseSlugs).toContain('tutorials/process-collections');
    const englishDocs = source.getPages('en').filter((page) => page.slugs[0] !== 'blog').map((page) => ({ slug: page.slugs }));
    expect(generateEnglishStaticParams()).toEqual(englishDocs);
    expect(generateChineseStaticParams()).toEqual(englishDocs);
    expect(generateBlogStaticParams().map(({ slug }) => ['blog', ...slug].join('/')).sort()).toEqual(
      englishSlugs.filter((slug) => slug === 'blog' || slug.startsWith('blog/')),
    );
    for (const page of source.getPages()) {
      expect(typeof page.data.body).toBe('function');
      expect((await page.data.getText('processed')).trim().length).toBeGreaterThan(0);
      const localized = page.locale === 'zh-CN';
      const blog = page.slugs[0] === 'blog';
      const props = pageProps(blog ? page.slugs.slice(1) : page.slugs);
      const Page = blog ? (localized ? ChineseBlogPage : BlogPage) : (localized ? ChinesePage : EnglishPage);
      expect(await Page(props)).toBeTruthy();
      const getMetadata = blog
        ? (localized ? generateChineseBlogMetadata : generateBlogMetadata)
        : (localized ? generateChineseMetadata : generateEnglishMetadata);
      const metadata = await getMetadata(props);
      expect(metadata.description).toBe(page.data.description);
      expect(metadata.alternates?.canonical).toBe(page.url);
      expect(metadata.openGraph).toMatchObject({ type: 'article', url: page.url, images: [getPageImageUrl(page).url] });
      const siteName = localized ? 'XGo 文档' : appName;
      expect(metadata.title).toEqual(page.data.title === siteName ? { absolute: siteName } : page.data.title);
      expect(metadata.alternates?.languages).toEqual({
        en: source.getPage(page.slugs, 'en')!.url,
        ...(source.getPage(page.slugs, 'zh-CN') ? { 'zh-CN': source.getPage(page.slugs, 'zh-CN')!.url } : {}),
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

  it.each(['en', 'zh-CN'] as const)('renders tutorial runners from the authored fences in %s', async (locale) => {
    const page = source.getPage(['tutorials', 'organize-projects'], locale)!;
    const Body = page.data.body;
    const html = renderSite(<Body components={getMDXComponents()} />, page.url);
    expect(html.match(/<textarea\b/g)).toHaveLength(2);
    expect(html).toContain(locale === 'en' ? 'Try this example' : '在线运行示例');
    expect(html).toContain('-- main.xgo --');
    expect(html).toContain('-- greeting.xgo --');
    expect(html).toContain('#!/usr/bin/env -S xgo run');
    const markdown = await page.data.getText('processed');
    expect(markdown).toContain('```xgo');
    expect(markdown).not.toContain('RunnableXGo');
    expect(markdown).not.toContain('-- main.xgo --');
  });

  it.each(['en', 'zh-CN'] as const)('places the edit action below the article and its desktop contents in %s', async (locale) => {
    const page = source.getPage(['getting-started', 'installation'], locale)!;
    const RootLayout = locale === 'en' ? EnglishRootLayout : ChineseRootLayout;
    const DocsLayout = locale === 'en' ? EnglishDocsLayout : ChineseDocsLayout;
    const Page = locale === 'en' ? EnglishPage : ChinesePage;
    const html = renderSite(
      <RootLayout params={Promise.resolve({})}>
        <DocsLayout params={Promise.resolve({})}>{await Page(pageProps(page.slugs))}</DocsLayout>
      </RootLayout>,
      page.url,
    );
    const editHref = 'href="' + getPageEditUrl(page.path) + '"';
    const articleStart = html.indexOf('id="nd-page"');
    const article = html.slice(articleStart, html.indexOf('</article>', articleStart));
    const toc = html.slice(html.indexOf('id="nd-toc"'));
    expect(article.indexOf(editHref)).toBeGreaterThan(article.indexOf('class="doc-sources"'));
    expect(toc.indexOf(editHref)).toBeGreaterThan(toc.indexOf('id="toc-title"'));
    expect(html.split(editHref)).toHaveLength(3);
    expect(article).toContain(locale === 'en' ? '>Edit this page</a>' : '>编辑此页</a>');
    expect(article).toContain(locale === 'en' ? 'Last updated:' : '最后更新：');
  });

  it('puts the blog edit action after the article content', async () => {
    const slug = 'goodbye-printf';
    const page = source.getPage(['blog', slug], 'en')!;
    const html = renderSite(
      <EnglishRootLayout params={Promise.resolve({})}>
        <EnglishHomeLayout params={Promise.resolve({})}>{await BlogPage(pageProps([slug]))}</EnglishHomeLayout>
      </EnglishRootLayout>,
      page.url,
    );
    const editHref = 'href="' + getPageEditUrl(page.path) + '"';
    expect(html.indexOf(editHref)).toBeGreaterThan(html.indexOf('class="doc-sources"'));
    expect(html.split(editHref)).toHaveLength(2);
    expect(html).toContain('>Edit this page</a>');
    expect(html).toContain('Last updated:');
  });

  it.each([
    ['en', 'Last updated:', 'Nov 26, 2026', 'Unavailable'],
    ['zh-CN', '最后更新：', '2026年11月26日', '暂无记录'],
  ] as const)('renders the update timestamp and an empty-history label in %s', (locale, label, localDate, empty) => {
    const editUrl = getPageEditUrl('example.mdx');
    const lastModified = new Date('2026-11-26T08:15:42.000Z');
    const html = renderToStaticMarkup(<ContentPageFooter editUrl={editUrl} lastModified={lastModified} locale={locale} />);
    expect(html).toContain(label);
    expect(html).toContain('<time dateTime="2026-11-26T08:15:42.000Z">');
    expect(html).toContain(localDate);
    expect(html).toContain('08:15:42');
    expect(html).toContain('UTC');
    const missing = renderToStaticMarkup(<ContentPageFooter editUrl={editUrl} locale={locale} />);
    expect(missing).toContain(empty);
    expect(missing).not.toContain('<time');
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
    expect(getPageSources('llgo/index.mdx').externalFiles).toContainEqual({
      label: 'xgo-dev/llgo/README.md',
      url: 'https://github.com/xgo-dev/llgo/blob/52d17197e475f1c1f99d8472091defdfc63526ea/README.md',
    });
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

  it.each(['en', 'zh-CN'])('exports all install commands and directory entries as Markdown in %s', async (locale) => {
    const installation = source.getPage(['getting-started', 'installation'], locale)!;
    const installText = await installation.data.getText('processed');
    for (const command of ['winget install goplus.xgo', 'sudo apt install xgo', 'sudo yum install xgo', 'brew install xgo', './all.bash', 'all.bat']) {
      expect(installText).toContain(command);
    }
    expect(installText).not.toMatch(/<Tabs|<PlatformLogo/);

    const pack = source.getPage(['toolchain', 'pack-project-configuration'], locale)!;
    const packText = await pack.data.getText('processed');
    expect(packText).toContain('assets/\n├── index.json\n└── player/\n    └── index.json');
    expect(packText).not.toContain('<Files');
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
    expect(englishResults).toContainEqual(expect.objectContaining({ url: '/docs/tutorials/control-flow' }));
    expect(englishResults.every((result: { url: string }) => /^\/(?:docs|blog)(?:\/|#|$)/.test(result.url))).toBe(true);
    const blog = await getSearch(new Request('http://localhost/api/search?query=Goodbye+printf'));
    expect(await blog.json()).toContainEqual(expect.objectContaining({ url: '/blog/goodbye-printf' }));

    const chinese = await getSearch(new Request('http://localhost/api/search?query=%E7%AC%AC%E4%B8%80%E4%B8%AA&locale=zh-CN'));
    expect(chinese.status).toBe(200);
    const chineseResults = await chinese.json();
    expect(chineseResults.length).toBeGreaterThan(0);
    expect(chineseResults.every((result: { url: string }) => /^\/zh-CN\/(?:docs|blog)(?:\/|#|$)/.test(result.url))).toBe(true);

    const projects = await getSearch(new Request('http://localhost/api/search?query=LLGo'));
    expect(await projects.json()).toContainEqual(expect.objectContaining({ url: '/docs/llgo' }));
    const unmatched = await getSearch(new Request('http://localhost/api/search?query=zzzxgononexistent987654321'));
    expect(await unmatched.json()).toEqual([]);
  }, 30_000);

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

    const blog = proxy(new NextRequest('http://localhost/blog/goodbye-printf', { headers: { Accept: 'text/markdown' } }));
    expect(blog.headers.get('x-middleware-rewrite')).toBe('http://localhost/llms.mdx/blog/goodbye-printf.md');
    expect(blog.headers.get('Vary')).toBe('Accept');
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
