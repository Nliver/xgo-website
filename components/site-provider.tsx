'use client';

import { FrameworkProvider, type Framework } from 'fumadocs-core/framework';
import { RootProvider } from 'fumadocs-ui/provider/base';
import { i18nProvider } from 'fumadocs-ui/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { blogRoute, docsRoute, i18n, translations } from '@/lib/shared';

// Static English pages are rendered under /en, but their public URLs omit the locale.
function usePublicPathname() {
  const pathname = usePathname();
  const prefix = `/${i18n.defaultLanguage}`;
  if (pathname === prefix) return '/';
  return pathname.startsWith(prefix + '/') ? pathname.slice(prefix.length) : pathname;
}

export function SiteProvider({ locale, translatedPaths, children }: {
  locale: string;
  translatedPaths: string[];
  children: ReactNode;
}) {
  const pathname = usePublicPathname();
  const router = useRouter();
  const missingChinese = locale === 'en' && [docsRoute, blogRoute].some((route) =>
    pathname === route || pathname.startsWith(`${route}/`),
  ) && !translatedPaths.includes(pathname);

  const provider = i18nProvider(translations, locale);
  return (
    <FrameworkProvider
      Link={Link as Framework['Link']}
      Image={Image as Framework['Image']}
      useParams={useParams}
      useRouter={useRouter}
      usePathname={usePublicPathname}
    >
      <RootProvider i18n={{
        ...provider,
        locales: [
          { locale: 'en', name: 'English' },
          { locale: 'zh-CN', name: missingChinese ? '简体中文（此页暂无译文）' : '简体中文' },
        ],
        onLocaleChange: missingChinese ? (language) => {
          if (language === 'zh-CN') router.push(`${pathname}?translation=zh-CN`);
        } : undefined,
      }}>
        {children}
      </RootProvider>
    </FrameworkProvider>
  );
}
