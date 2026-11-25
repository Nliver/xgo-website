import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <HomeLayout {...baseOptions()}>{children}</HomeLayout>
    </>
  );
}
