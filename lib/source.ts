import { createElement } from 'react';
import { XBuilderLogo, XGoLogo } from '@/components/xgo-logo';
import { createGetUrl, llms, loader } from 'fumadocs-core/source';
import { flattenTree } from 'fumadocs-core/page-tree';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { blogRoute, docsRoute, i18n } from './shared';
import { defineDocs } from 'fumadocs-mdx/macro';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema,
    lastModified: true,
    postprocess: {
      includeProcessedMarkdown: {
        filterElement(node) {
          if (node.type !== 'mdxJsxFlowElement') return true;
          if (node.name === 'TabsList') return false;
          if (node.name === 'Tabs' || node.name === 'TabsContent') return 'children-only';
          return true;
        },
      },
    },
  },
  meta: {
    schema: metaSchema,
  },
});

const getDocsUrl = createGetUrl(docsRoute, i18n);
const getBlogUrl = createGetUrl(blogRoute, i18n);

// Keep the shared content index for search, source records, and Markdown exports.
export const source = loader({
  baseUrl: docsRoute,
  url: (slugs, locale) => slugs[0] === 'blog'
    ? getBlogUrl(slugs.slice(1), locale)
    : getDocsUrl(slugs, locale),
  i18n,
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

function isBlogFolder(node: ReturnType<typeof source.getPageTree>['children'][number]) {
  return node.type === 'folder' && node.$ref?.folder === 'blog';
}

export function getDocsPageTree(locale: string) {
  const tree = source.getPageTree(locale);
  return {
    ...tree,
    children: tree.children.filter((node) => !isBlogFolder(node)).map((node) => (
      node.type === 'folder' && node.$ref?.folder === '(xgo)'
        ? { ...node, icon: createElement(XGoLogo) }
        : node.type === 'folder' && node.$ref?.folder === 'xbuilder'
          ? { ...node, icon: createElement(XBuilderLogo) }
          : node
    )),
  };
}

export function getDocsPages(locale?: string) {
  return source.getPages(locale).filter((page) => page.slugs[0] !== 'blog');
}

export function getBlogPosts(locale: string) {
  return flattenTree(source.getPageTree(locale).children.filter(isBlogFolder))
    .flatMap((node) => {
      const page = source.getNodePage(node, locale);
      return page && page.slugs.length > 1 ? [page] : [];
    });
}

export function resolveChineseDocs(slug: string[] = []) {
  const translated = source.getPage(slug, 'zh-CN');
  if (translated) return { page: translated };

  const fallback = slug.length > 0
    ? source.getPage(slug, 'en')
    : source.getPage(['getting-started', 'hello-world'], 'zh-CN');
  return { redirectTo: fallback };
}

export const docsLlms = llms(source, {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${await page.data.getText('processed')}`,
});
