import { siteOrigin } from '@/lib/shared';
import { SiteDocument } from '@/components/site-document';
import type { Metadata } from 'next';
import '../global.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: 'XGo Documentation',
    template: '%s | XGo Documentation',
  },
  description: 'Learn XGo from the first program to advanced language features.',
  openGraph: {
    type: 'website',
    siteName: 'XGo Documentation',
    title: 'XGo Documentation',
    description: 'Learn XGo from the first program to advanced language features.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XGo Documentation',
    description: 'Learn XGo from the first program to advanced language features.',
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <SiteDocument locale="en">{children}</SiteDocument>
  );
}

