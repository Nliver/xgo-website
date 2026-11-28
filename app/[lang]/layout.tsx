import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { i18n } from '@/lib/shared';

export async function generateMetadata({ params }: LayoutProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params;
  if (lang !== 'zh-CN') return {};
  return {
    title: { default: 'XGo 文档', template: '%s | XGo 文档' },
    description: '从第一个程序开始学习 XGo。',
  };
}

export default async function LanguageLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!i18n.languages.some((language) => language === lang)) notFound();
  return children;
}
