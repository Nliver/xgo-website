import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SiteDocument } from '@/components/site-document';
import { siteOrigin } from '@/lib/shared';
import { source } from '@/lib/source';
import './global.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  icons: { icon: { url: '/logos/xgo.svg', type: 'image/svg+xml', sizes: 'any' } },
  title: { default: 'XGo Documentation', template: '%s | XGo Documentation' },
  description: 'Learn XGo from the first program to advanced language features.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const translatedPaths = source.getPages('zh-CN').map((page) => page.url.replace(/^\/zh-CN/, ''));
  return <SiteDocument translatedPaths={translatedPaths}>{children}</SiteDocument>;
}
