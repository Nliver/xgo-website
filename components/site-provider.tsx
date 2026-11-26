'use client';

import { RootProvider } from 'fumadocs-ui/provider/next';
import { i18nProvider } from 'fumadocs-ui/i18n';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { blogRoute, docsRoute, translations } from '@/lib/shared';

export function SiteProvider({ locale, translatedPaths, children }: {
  locale: 'en' | 'zh-CN';
  translatedPaths: string[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const englishPath = pathname.replace(/^\/zh-CN(?=\/|$)/, '') || '/';
  const translated = translatedPaths.includes(englishPath);
  const isContentPage = [docsRoute, blogRoute].some((route) =>
    englishPath === route || englishPath.startsWith(`${route}/`),
  );

  function changeLanguage(language: string) {
    if (language === locale) return;
    if (language === 'en') {
      router.push(englishPath);
      return;
    }
    if (!isContentPage) {
      router.push('/zh-CN');
      return;
    }
    router.push(translated
      ? `/zh-CN${englishPath}`
      : `${englishPath}?translation=zh-CN`);
  }

  const provider = i18nProvider(translations, locale);
  return (
    <RootProvider i18n={{
      ...provider,
      locales: [
        { locale: 'en', name: 'English' },
        { locale: 'zh-CN', name: isContentPage && !translated ? '简体中文（此页暂无译文）' : '简体中文' },
      ],
      onLocaleChange: changeLanguage,
    }}>
      {children}
    </RootProvider>
  );
}
