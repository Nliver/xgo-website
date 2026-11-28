'use client';

import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { i18n } from '@/lib/shared';
import { SiteProvider } from './site-provider';

export function SiteDocument({ translatedPaths, children }: {
  translatedPaths: string[];
  children: ReactNode;
}) {
  const { lang } = useParams<{ lang: string }>();
  const locale = i18n.languages.find((language) => language === lang) ?? i18n.defaultLanguage;
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <SiteProvider locale={locale} translatedPaths={translatedPaths}>{children}</SiteProvider>
      </body>
    </html>
  );
}
