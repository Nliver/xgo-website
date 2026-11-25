import { docsLlms, resolveChineseDocs, source } from '@/lib/source';

export const revalidate = false;
// other paths are 404s, never cached responses
export const dynamicParams = false;

const markdownRedirects = new Map<string, string>();
for (const page of source.getPages('en')) {
  const { redirectTo } = resolveChineseDocs(page.slugs);
  if (redirectTo) markdownRedirects.set(`/zh-CN${page.url}.md`, `${redirectTo.url}.md`);
}

export async function GET(_req: Request, { params }: RouteContext<'/llms.mdx/[...path]'>) {
  const { path } = await params;
  const pathname = `/${path.join('/')}`;
  const target = markdownRedirects.get(encodeURI(pathname));
  if (target) return new Response(null, { status: 307, headers: { Location: target } });
  return (await docsLlms.serve(pathname)) ?? new Response(null, { status: 404 });
}

export async function generateStaticParams() {
  const params: { path: string[] }[] = [];
  for (const file of [...await docsLlms.files(), ...markdownRedirects.keys()]) {
    // `/llms.txt` and `/llms-full.txt` have their own routes
    if (!/^\/llms(-full)?\.txt$/.test(file))
      params.push({ path: decodeURI(file).slice(1).split('/') });
  }
  return params;
}
