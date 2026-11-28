import Link from 'next/link';

export default function NotFound({ locale = 'en' }: { locale?: string }) {
  const chinese = locale === 'zh-CN';
  return (
    <main id="nd-page" tabIndex={-1} className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col justify-center gap-5 px-6">
      <h1 className="text-3xl font-semibold">{chinese ? '未找到页面' : 'Page not found'}</h1>
      <p>{chinese ? '这个地址没有对应的文档。' : 'We couldn’t find a page at this address.'}</p>
      <Link className="underline" href={chinese ? '/zh-CN/docs' : '/docs'}>
        {chinese ? '返回中文文档' : 'Return to the documentation'}
      </Link>
    </main>
  );
}
