import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TranslationNotice } from './translation-notice';
import { notFound } from 'next/navigation';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  EditOnGitHub,
  MarkdownCopyButton,
} from 'fumadocs-ui/layouts/notebook/page';
import { getMDXComponents } from '@/components/mdx';
import { appName, getPageImageUrl } from '@/lib/shared';
import { source } from '@/lib/source';
import { getPageEditUrl, getPageGitHubUrl, getPageSources } from '@/lib/upstream';
import { PageActions } from './page-actions';

const timestampOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'UTC',
  timeZoneName: 'short',
};
const timestampFormatters = {
  en: new Intl.DateTimeFormat('en', timestampOptions),
  'zh-CN': new Intl.DateTimeFormat('zh-CN', timestampOptions),
};

export function DocumentationPage({ slug, locale }: { slug?: string[]; locale: 'en' | 'zh-CN' }) {
  const page = source.getPage(slug, locale);
  if (!page) notFound();

  const chinese = locale === 'zh-CN';
  const MDX = page.data.body;
  const markdownUrl = `${page.url}.md`;
  const editUrl = getPageEditUrl(page.path, locale);
  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      tableOfContent={page.data.toc.length > 0 ? {
        footer: (
          <div className="mt-2 shrink-0 border-t pt-2">
            <EditOnGitHub href={editUrl} />
          </div>
        ),
      } : undefined}
      tabIndex={-1}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      {!chinese && (
        <Suspense fallback={null}>
          <TranslationNotice originalUrl={page.url} translatedUrl={source.getPage(slug, 'zh-CN')?.url} />
        </Suspense>
      )}
      <ContentPageActions path={page.path} markdownUrl={markdownUrl} locale={locale} />
      <DocsBody>
        <MDX components={getMDXComponents({ a: createRelativeLink(source, page) })} />
      </DocsBody>
      <ContentPageSources path={page.path} locale={locale} />
      <ContentPageFooter editUrl={editUrl} lastModified={page.data.lastModified} locale={locale} />
    </DocsPage>
  );
}

export function ContentPageFooter({ editUrl, lastModified, locale }: {
  editUrl: string;
  lastModified?: Date;
  locale: 'en' | 'zh-CN';
}) {
  const chinese = locale === 'zh-CN';
  return (
    <footer className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b pb-4 text-sm">
      <EditOnGitHub
        href={editUrl}
        className="min-h-7 border-0 bg-transparent p-0 text-sm text-fd-primary hover:bg-transparent hover:underline"
      >
        {chinese ? '编辑此页' : 'Edit this page'}
      </EditOnGitHub>
      <p className="ms-auto text-end text-fd-muted-foreground">
        {chinese ? '最后更新：' : 'Last updated: '}
        {lastModified ? (
          <time dateTime={lastModified.toISOString()}>{timestampFormatters[locale].format(lastModified)}</time>
        ) : chinese ? '暂无记录' : 'Unavailable'}
      </p>
    </footer>
  );
}

export function ContentPageActions({ path, markdownUrl, locale }: { path: string; markdownUrl: string; locale: 'en' | 'zh-CN' }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b pb-6">
      <MarkdownCopyButton markdownUrl={markdownUrl} />
      <PageActions markdownUrl={markdownUrl} githubUrl={getPageGitHubUrl(path, locale)} locale={locale} />
    </div>
  );
}

export function ContentPageSources({ path, locale }: { path: string; locale: 'en' | 'zh-CN' }) {
  const chinese = locale === 'zh-CN';
  const sources = getPageSources(path, locale);
  return (
    <details className="doc-sources">
        <summary>{chinese ? '本页来源' : 'Sources for this page'}</summary>
        <p>{chinese ? '来源核对日期 ' : 'Sources checked on '}<time dateTime={sources.checkedAt}>{sources.checkedAt}</time></p>
        <ul>
          {sources.files.map((file) => (
            <li key={file.path}><a href={file.url}><code>{file.path}</code></a></li>
          ))}
        </ul>
        <p>{sources.copyright} <a href={sources.licenseUrl}>{sources.license}</a>.</p>
        {sources.externalFiles.length > 0 && (
          <>
            <p>{chinese ? '相关项目来源' : 'Sources from related projects'}</p>
            <ul>{sources.externalFiles.map((file) => (
              <li key={file.url}><a href={file.url}><code>{file.label}</code></a></li>
            ))}</ul>
          </>
        )}
    </details>
  );
}

export function documentationMetadata(slug: string[] | undefined, locale: 'en' | 'zh-CN'): Metadata {
  const page = source.getPage(slug, locale);
  if (!page) notFound();
  const { title, description } = page.data;
  const images = [getPageImageUrl(page).url];
  const siteName = locale === 'zh-CN' ? 'XGo 文档' : appName;

  return {
    title: title === siteName ? { absolute: title } : title,
    description,
    alternates: {
      canonical: page.url,
      languages: Object.fromEntries(['en', 'zh-CN'].flatMap((language) => {
        const translatedPage = source.getPage(slug, language);
        return translatedPage ? [[language, translatedPage.url]] : [];
      })),
    },
    openGraph: { type: 'article', siteName, title, description, images, url: page.url },
    twitter: { card: 'summary_large_image', title, description, images },
  };
}
