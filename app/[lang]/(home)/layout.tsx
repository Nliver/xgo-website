import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';
export default async function Layout({ children, params = Promise.resolve({}) }: { children: React.ReactNode; params?: Promise<{ lang?: string }> }) {
  const { lang } = await params;
  const locale = lang === 'zh-CN' ? 'zh-CN' : 'en';
  return <><a className="skip-link" href="#main-content">{locale === 'zh-CN' ? '跳至正文' : 'Skip to main content'}</a><HomeLayout {...baseOptions(locale)}>{children}</HomeLayout></>;
}
