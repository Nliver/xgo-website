import { getDocsPageTree } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
import { baseOptions } from '@/lib/layout.shared';

export default function Layout({ children }: LayoutProps<'/zh-CN/docs'>) {
  const options = baseOptions('zh-CN');
  return <DocsLayout {...options} tree={getDocsPageTree('zh-CN')}>{children}</DocsLayout>;
}
