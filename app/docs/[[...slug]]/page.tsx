import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { getMDXComponents } from '@/components/mdx';
import { appName, getPageImageUrl } from '@/lib/shared';
import { source } from '@/lib/source';
import { getPageSources } from '@/lib/upstream';

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const { slug } = await props.params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = `${page.url}.md`;
  const sources = getPageSources(page.path);
  return (
    <DocsPage toc={page.data.toc} full={page.data.full} tabIndex={-1}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <div className="flex flex-wrap items-center gap-2 border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover markdownUrl={markdownUrl} githubUrl={sources.files[0].url} />
      </div>
      <DocsBody>
        <MDX components={getMDXComponents({ a: createRelativeLink(source, page) })} />
      </DocsBody>
      <details className="doc-sources">
        <summary>Sources for this page</summary>
        <p>Checked against the XGo repository on <time dateTime={sources.checkedAt}>{sources.checkedAt}</time>.</p>
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

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const page = source.getPage(slug);
  if (!page) notFound();
  const { title, description } = page.data;
  const images = [getPageImageUrl(page).url];

  return {
    title: title === appName ? { absolute: title } : title,
    description,
    alternates: { canonical: page.url },
    openGraph: { type: 'article', siteName: appName, title, description, images, url: page.url },
    twitter: { card: 'summary_large_image', title, description, images },
  };
}
