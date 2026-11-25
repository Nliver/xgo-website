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
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/notebook/page';
import { getMDXComponents } from '@/components/mdx';
import { appName, getPageImageUrl } from '@/lib/shared';
import { source } from '@/lib/source';
import { getPageSources } from '@/lib/upstream';

export function DocumentationPage({ slug, locale }: { slug?: string[]; locale: 'en' | 'zh-CN' }) {
  const page = source.getPage(slug, locale);
  if (!page) notFound();

  const chinese = locale === 'zh-CN';
  const MDX = page.data.body;
  const markdownUrl = `${page.url}.md`;
  const sources = getPageSources(page.path);
  return (
    <DocsPage toc={page.data.toc} full={page.data.full} tabIndex={-1}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      {!chinese && (
        <Suspense fallback={null}>
          <TranslationNotice originalUrl={page.url} translatedUrl={source.getPage(slug, 'zh-CN')?.url} />
        </Suspense>
      )}
      <div className="flex flex-wrap items-center gap-2 border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover markdownUrl={markdownUrl} githubUrl={sources.files[0].url} />
      </div>
      <DocsBody>
        <MDX components={getMDXComponents({ a: createRelativeLink(source, page) })} />
      </DocsBody>
      <details className="doc-sources">
        <summary>{chinese ? '本页来源' : 'Sources for this page'}</summary>
        <p>{chinese ? '已于 ' : 'Checked against the XGo repository on '}<time dateTime={sources.checkedAt}>{sources.checkedAt}</time>{chinese ? ' 核对 XGo 仓库。' : '.'}</p>
        <ul>
          {sources.files.map((file) => (
            <li key={file.path}><a href={file.url}><code>{file.path}</code></a></li>
          ))}
        </ul>
        <p>{sources.copyright} <a href={sources.licenseUrl}>{sources.license}</a>.</p>
      </details>
    </DocsPage>
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
