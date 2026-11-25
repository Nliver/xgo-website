import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { upstreamUrl } from './upstream';

export function baseOptions(locale: 'en' | 'zh-CN' = 'en'): BaseLayoutProps {
  const chinese = locale === 'zh-CN';
  return {
    nav: {
      title: (
        <span className="brand-mark">
          <span className="brand-mark__glyph" aria-hidden="true">X</span>
          <span>XGo<span className="brand-mark__suffix">{chinese ? ' 文档' : ' Documentation'}</span></span>
        </span>
      ),
      url: chinese ? '/zh-CN' : '/',
    },
    links: [
      { text: chinese ? '文档' : 'Docs', url: chinese ? '/zh-CN/docs' : '/docs', active: 'nested-url' },
      { text: chinese ? '在线试用' : 'Playground', url: 'https://play.xgo.dev/', external: true },
      { text: 'REPL', url: 'https://repl.xgo.dev/', external: true },
      {
        type: 'icon',
        label: 'Discord',
        text: 'Discord',
        url: 'https://discord.gg/mYjWCJDcAr',
        external: true,
        icon: (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.25a18.26 18.26 0 0 0-5.487 0 12.63 12.63 0 0 0-.618-1.25.077.077 0 0 0-.078-.037A19.74 19.74 0 0 0 3.676 4.37a.07.07 0 0 0-.032.028C.533 9.046-.319 13.58.099 18.058a.082.082 0 0 0 .031.056c2.053 1.508 4.042 2.423 5.993 3.03a.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.042-.106 12.85 12.85 0 0 1-1.872-.892.077.077 0 0 1-.007-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.011c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.01c.12.099.246.198.373.292a.077.077 0 0 1-.007.128 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.029c1.961-.607 3.95-1.522 6.002-3.03a.077.077 0 0 0 .032-.055c.5-5.177-.839-9.674-3.549-13.66a.061.061 0 0 0-.031-.029ZM8.02 15.331c-1.182 0-2.157-1.086-2.157-2.419s.956-2.419 2.157-2.419c1.211 0 2.176 1.096 2.157 2.419 0 1.333-.955 2.419-2.157 2.419Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419s.955-2.419 2.157-2.419c1.211 0 2.176 1.096 2.157 2.419 0 1.333-.946 2.419-2.157 2.419Z" />
          </svg>
        ),
      },
      {
        type: 'icon',
        label: 'X',
        text: 'X',
        url: 'https://x.com/xgodev',
        external: true,
        icon: (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.835L0 1.154h7.594l5.243 6.932 6.064-6.933Zm-1.29 19.491h2.039L6.487 3.24H4.299l13.312 17.404Z" />
          </svg>
        ),
      },
    ],
    githubUrl: upstreamUrl,
  };
}

