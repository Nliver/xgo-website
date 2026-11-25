import { siteOrigin } from '@/lib/shared';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import './global.css';

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
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}

