'use client';

import { Popover, PopoverContent, PopoverTrigger } from 'fumadocs-ui/components/ui/popover';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { usePathname } from 'fumadocs-core/framework';
import { cn } from '@/lib/cn';
import { ChevronDown, ExternalLinkIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { pageActionLogos } from './page-action-logos';

type PageActionsProps = ComponentProps<typeof PopoverTrigger> & {
  markdownUrl: string;
  githubUrl: string;
  locale: 'en' | 'zh-CN';
};

export function PageActions({ markdownUrl, githubUrl, locale, ...props }: PageActionsProps) {
  const pathname = usePathname();
  const chinese = locale === 'zh-CN';
  const pageUrl = typeof window === 'undefined' ? pathname : new URL(pathname, window.location.origin).href;
  const prompt = chinese
    ? `阅读 ${pageUrl}，我想就这篇文档提问。`
    : `Read ${pageUrl}, I want to ask questions about it.`;
  const items = [
    {
      title: chinese ? '在 GitHub 查看' : 'Open in GitHub',
      href: githubUrl,
      logo: pageActionLogos.github,
    },
    {
      title: chinese ? '查看 Markdown' : 'View as Markdown',
      href: markdownUrl,
      logo: pageActionLogos.markdown,
    },
    {
      title: chinese ? '在 ChatGPT 中打开' : 'Open in ChatGPT',
      href: `https://chatgpt.com/?${new URLSearchParams({ prompt, hints: 'search' })}`,
      logo: pageActionLogos.openai,
    },
    {
      title: chinese ? '在 Claude 中打开' : 'Open in Claude',
      href: `https://claude.ai/new?${new URLSearchParams({ q: prompt })}`,
      logo: pageActionLogos.claude,
    },
    {
      title: chinese ? '在 Cursor 中打开' : 'Open in Cursor',
      href: `https://cursor.com/link/prompt?${new URLSearchParams({ text: prompt })}`,
      logo: pageActionLogos.cursor,
    },
  ];

  return (
    <Popover>
      <PopoverTrigger
        {...props}
        className={(state) => cn(
          buttonVariants({ variant: 'secondary', size: 'sm' }),
          'gap-2 data-[popup-open]:bg-fd-accent data-[popup-open]:text-fd-accent-foreground',
          typeof props.className === 'function' ? props.className(state) : props.className,
        )}
      >
        {props.children ?? (chinese ? '打开' : 'Open')}
        <ChevronDown aria-hidden="true" className="size-3.5 text-fd-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="flex flex-col">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            rel="noreferrer noopener"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-2 focus-visible:outline-fd-ring"
          >
            <svg aria-hidden="true" className="size-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d={item.logo} />
            </svg>
            {item.title}
            <ExternalLinkIcon aria-hidden="true" className="ms-auto size-3.5 text-fd-muted-foreground" />
          </a>
        ))}
      </PopoverContent>
    </Popover>
  );
}
