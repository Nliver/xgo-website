import { NextFetchEvent, NextRequest, NextResponse } from 'next/server';
import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';
import { createI18nMiddleware } from 'fumadocs-core/i18n/middleware';
import { blogRoute, docsRoute, i18n } from '@/lib/shared';

const markdownRoutes = [docsRoute, `/zh-CN${docsRoute}`, blogRoute, `/zh-CN${blogRoute}`].map((route) =>
  rewritePath(`${route}{/*path}`, `/llms.mdx${route}{/*path}.md`),
);
const handleI18n = createI18nMiddleware(i18n);

export default function proxy(request: NextRequest, event?: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  if (isMarkdownPreferred(request) && !/\.(md|txt)$/.test(pathname)) {
    for (const { rewrite } of markdownRoutes) {
      const result = rewrite(pathname);
      if (result) return NextResponse.rewrite(new URL(result, request.nextUrl), { headers: { Vary: 'Accept' } });
    }
  }
  return handleI18n(request, event as NextFetchEvent) as NextResponse;
}

export const config = {
  matcher: ['/((?!api|_next|llms|og|.*\\..*).*)'],
};
