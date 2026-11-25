import { documentImage, documentImageParams } from '@/lib/docs-image';

export const revalidate = false;
export const dynamicParams = false;

export async function GET(_req: Request, { params }: RouteContext<'/og/docs/[...slug]'>) {
  const { slug } = await params;
  return documentImage('en', slug);
}

export function generateStaticParams() {
  return documentImageParams('en');
}
