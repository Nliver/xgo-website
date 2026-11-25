import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName } from './shared';
import { upstreamUrl } from './upstream';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <span className="brand-mark"><span className="brand-mark__glyph" aria-hidden="true">X</span>{appName}</span>,
    },
    links: [
      { text: 'Docs', url: '/docs' },
      { text: 'Playground', url: 'https://play.xgo.dev/', external: true },
      { text: 'REPL', url: 'https://repl.xgo.dev/', external: true },
    ],
    githubUrl: upstreamUrl,
  };
}

