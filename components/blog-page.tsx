import { Suspense } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { InlineTOC } from 'fumadocs-ui/components/inline-toc';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { ContentPageActions, ContentPageFooter, ContentPageSources, documentationMetadata } from '@/components/docs-page';
import { getMDXComponents } from '@/components/mdx';
import { TranslationNotice } from '@/components/translation-notice';
import { blogRoute } from '@/lib/shared';
import { getBlogPosts, source } from '@/lib/source';
import { getPageEditUrl } from '@/lib/upstream';

type Locale = 'en' | 'zh-CN';

function getBlogPage(slug: string[] | undefined, locale: Locale) {
  const slugs = ['blog', ...slug ?? []];
  const page = source.getPage(slugs, locale);
  if (page) return page;

  const original = locale === 'zh-CN' && source.getPage(slugs, 'en');
  if (original) redirect(`${original.url}?translation=zh-CN`);
  notFound();
}

export function blogMetadata(slug: string[] | undefined, locale: Locale) {
  const page = getBlogPage(slug, locale);
  return documentationMetadata(page.slugs, locale);
}

export function BlogPage({ slug, locale }: { slug?: string[]; locale: Locale }) {
  const page = getBlogPage(slug, locale);
  const isIndex = page.slugs.length === 1;
  const chinese = locale === 'zh-CN';
  const MDX = page.data.body;
  const blogUrl = chinese ? `/zh-CN${blogRoute}` : blogRoute;

  return (
    <article
      id="main-content"
      tabIndex={-1}
      className={isIndex ? 'blog-shell mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16' : 'blog-shell mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14'}
    >
      <header className="mb-8">
        {!isIndex && <Link className="mb-5 inline-block text-sm font-medium text-fd-primary hover:underline" href={blogUrl}>
          <span aria-hidden="true">← </span>{chinese ? '返回博客' : 'Back to Blog'}
        </Link>}
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{page.data.title}</h1>
        <p className="mt-4 max-w-2xl text-lg text-fd-muted-foreground">{page.data.description}</p>
      </header>
      {!chinese && (
        <Suspense fallback={null}>
          <TranslationNotice originalUrl={page.url} translatedUrl={source.getPage(page.slugs, 'zh-CN')?.url} />
        </Suspense>
      )}
      {!isIndex && (
        <>
          <ContentPageActions path={page.path} markdownUrl={`${page.url}.md`} locale={locale} />
          {page.data.toc.length > 0 && <InlineTOC className="mt-6" items={page.data.toc} />}
        </>
      )}
      <div className={isIndex ? 'prose max-w-2xl' : 'prose mt-8 min-w-0'}>
        <MDX components={getMDXComponents({ a: createRelativeLink(source, page) })} />
      </div>
      {isIndex && (
        <ul className="blog-list" aria-label={chinese ? '博客文章' : 'Blog articles'}>
          {getBlogPosts(locale).map((post, index) => (
            <li className={index === 0 ? 'blog-featured' : undefined} key={post.url}>
              <Link className="blog-card" href={post.url} aria-labelledby={`blog-post-${index}`}>
                <h2 id={`blog-post-${index}`}>{post.data.title}</h2>
                <p>{post.data.description}</p>
                <span className="blog-card__link" aria-hidden="true">{chinese ? '阅读文章' : 'Read article'} →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <ContentPageSources path={page.path} locale={locale} />
      {!isIndex && (
        <ContentPageFooter editUrl={getPageEditUrl(page.path)} lastModified={page.data.lastModified} locale={locale} />
      )}
    </article>
  );
}
