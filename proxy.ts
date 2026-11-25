import { NextRequest, NextResponse } from 'next/server';
import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';
import { docsRoute } from '@/lib/shared';

const { rewrite: rewriteEnglish } = rewritePath(
  `${docsRoute}{/*path}`,
  `/llms.mdx${docsRoute}{/*path}.md`,
);

const { rewrite: rewriteChinese } = rewritePath(
  `/zh-CN${docsRoute}{/*path}`,
  `/llms.mdx/zh-CN${docsRoute}{/*path}.md`,
);

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // files like `/docs/page.md` are served by the rewrites of the Next.js config
  const result =
    isMarkdownPreferred(request) && !/\.(md|txt)$/.test(pathname) && (rewriteEnglish(pathname) || rewriteChinese(pathname));

  if (result) {
    return NextResponse.rewrite(new URL(result, request.nextUrl), {
      // this URL has two representations, selected by `Accept`
      headers: { Vary: 'Accept' },
    });
  }

  return NextResponse.next();
}
