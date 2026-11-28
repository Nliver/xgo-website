'use client';

import { useParams } from 'next/navigation';
import NotFound from '@/components/not-found';

export default function LocalizedNotFound() {
  const { lang } = useParams<{ lang: string }>();
  return <NotFound locale={lang} />;
}
