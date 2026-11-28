import { getDocsPageTree } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
import { baseOptions } from '@/lib/layout.shared';
export default async function Layout({ children, params = Promise.resolve({}) }: { children: React.ReactNode; params?: Promise<{ lang?: string }> }) {
  const { lang } = await params;
  const locale = lang === 'zh-CN' ? 'zh-CN' : 'en';
  return <DocsLayout {...baseOptions(locale)} tree={getDocsPageTree(locale)}>{children}</DocsLayout>;
}
