import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';

export default function Layout({ children }: LayoutProps<'/zh-CN'>) {
  return (
    <>
      <a className="skip-link" href="#main-content">跳至正文</a>
      <HomeLayout {...baseOptions('zh-CN')}>{children}</HomeLayout>
    </>
  );
}
