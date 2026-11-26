import { NextRequest, NextResponse } from 'next/server';
import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';
import { blogRoute, docsRoute } from '@/lib/shared';

const markdownRoutes = [docsRoute, `/zh-CN${docsRoute}`, blogRoute, `/zh-CN${blogRoute}`].map((route) =>
  rewritePath(`${route}{/*path}`, `/llms.mdx${route}{/*path}.md`),
);

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Explicit Markdown filenames are handled by the rewrites in the Next.js config.
  if (!isMarkdownPreferred(request) || /\.(md|txt)$/.test(pathname)) return NextResponse.next();

  for (const { rewrite } of markdownRoutes) {
    const result = rewrite(pathname);
    if (result) {
      return NextResponse.rewrite(new URL(result, request.nextUrl), {
        headers: { Vary: 'Accept' },
      });
    }
  }

  return NextResponse.next();
}
