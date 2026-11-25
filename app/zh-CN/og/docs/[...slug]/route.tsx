import { documentImage, documentImageParams } from '@/lib/docs-image';

export const revalidate = false;
export const dynamicParams = false;

export async function GET(_req: Request, { params }: RouteContext<'/zh-CN/og/docs/[...slug]'>) {
  const { slug } = await params;
  return documentImage('zh-CN', slug);
}

export function generateStaticParams() {
  return documentImageParams('zh-CN');
}
