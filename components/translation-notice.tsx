'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export function TranslationNotice({ originalUrl, translatedUrl }: { originalUrl: string; translatedUrl?: string }) {
  const params = useSearchParams();
  if (params.get('translation') !== 'zh-CN') return null;
  return (
    <p lang="zh-CN" className="rounded-lg border p-4 text-sm">
      {translatedUrl ? (
        <Link className="underline" href={translatedUrl} hrefLang="zh-CN">阅读本页的简体中文版</Link>
      ) : (
        <>
          此页暂未提供简体中文译文，当前显示英文原文。{' '}
          <Link className="underline" href={originalUrl} hrefLang="en">继续阅读英文原文</Link>
          {' · '}
          <Link className="underline" href="/zh-CN/docs" hrefLang="zh-CN">浏览中文文档</Link>
        </>
      )}
    </p>
  );
}
