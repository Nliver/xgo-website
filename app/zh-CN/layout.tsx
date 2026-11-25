import { SiteDocument } from '@/components/site-document';
import { metadata as siteMetadata } from '../(english)/layout';
import '../global.css';

export const metadata = {
  ...siteMetadata,
  title: { default: 'XGo 文档', template: '%s | XGo 文档' },
  description: '从第一个程序开始学习 XGo。',
};

export default function Layout({ children }: LayoutProps<'/zh-CN'>) {
  return <SiteDocument locale="zh-CN">{children}</SiteDocument>;
}
