import { source } from '@/lib/source';
import { SiteProvider } from './site-provider';
import type { ReactNode } from 'react';

export function SiteDocument({ locale, children }: {
  locale: 'en' | 'zh-CN';
  children: ReactNode;
}) {
  const translatedPaths = source.getPages('zh-CN').map((page) => page.url.replace(/^\/zh-CN/, ''));
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <SiteProvider locale={locale} translatedPaths={translatedPaths}>{children}</SiteProvider>
      </body>
    </html>
  );
}
