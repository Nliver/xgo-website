import type { Metadata } from 'next';
import Link from 'next/link';
import { XGoLogo } from '@/components/xgo-logo';
import { getPageImageUrl, homePaths } from '@/lib/shared';

const englishRoutes = [
  ['Language tutorials', 'Declare variables, format strings, and define your own functions.', '/docs/tutorials/first-program'],
  ['Language reference', 'Look up syntax for function calls, strings, slices, and maps.', '/docs/reference/language'],
  ['Working with Go', 'Use a Go package and build a project with both Go and XGo files.', '/docs/interoperability/go'],
  ['Concurrency', 'Collect results from a goroutine and use select to read a ready channel.', '/docs/tutorials/concurrency'],
  ['Command-line tools', 'Find commands for running a file, building a package, and testing a project.', '/docs/toolchain/command-reference'],
  ['Ecosystem projects', 'Explore LLGo, iXGo, and tools for building games with SPX.', '/docs/ecosystem'],
] as const;
const chineseRoutes = [
  ['语言教程', '声明变量、格式化字符串，并定义自己的函数。', '/zh-CN/docs/tutorials/first-program'],
  ['语言参考', '查找函数调用、字符串、切片和映射的语法。', '/zh-CN/docs/reference/language'],
  ['与 Go 协作', '使用 Go 包，并在同一个项目中混合 Go 和 XGo 文件。', '/zh-CN/docs/interoperability/go'],
  ['并发编程', '用通道收集 goroutine 的结果，再用 select 读取就绪的通道。', '/zh-CN/docs/tutorials/concurrency'],
  ['命令行工具', '从运行单个文件到构建和测试项目，按任务查找命令。', '/zh-CN/docs/toolchain/command-reference'],
  ['生态项目', '探索 LLGo、iXGo 和使用 SPX 开发游戏的工具。', '/zh-CN/docs/ecosystem'],
] as const;

const metadata: Metadata = {
  alternates: { canonical: homePaths.en, languages: homePaths },
  description: 'Install XGo, run your first program, and learn how XGo works with Go.',
};

export async function generateMetadata({ params }: { params: Promise<{ lang?: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (lang !== 'zh-CN') return metadata;
  const description = '从第一个程序开始学习 XGo，并逐步掌握它与 Go 的协作方式。';
  const image = getPageImageUrl({ slugs: [], locale: 'zh-CN' }).url;
  return { alternates: { canonical: homePaths['zh-CN'], languages: homePaths }, description, openGraph: { type: 'website', url: '/zh-CN', title: 'XGo 文档', description, images: [image] }, twitter: { card: 'summary_large_image', title: 'XGo 文档', description, images: [image] } };
}

export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'zh-CN' }];
}

export default async function HomePage({ params = Promise.resolve({}) }: { params?: Promise<{ lang?: string }> }) {
  const { lang } = await params;
  const chinese = lang === 'zh-CN';
  const routes = chinese ? chineseRoutes : englishRoutes;
  const prefix = chinese ? '/zh-CN' : '';
  return (
    <div id="main-content" className="home-shell" tabIndex={-1}>
      <section className="home-hero"><div><h1>{chinese ? <>用 <em>XGo</em> 编程</> : <>Programming with <em>XGo</em></>}</h1><p className="hero-lede">{chinese ? 'XGo 是一种兼容 Go 的编程语言，适用于工程、STEM 教育和数据科学。从一行程序开始，然后在 Go 项目中使用它。' : 'XGo is a Go-compatible language for engineering, STEM education, and data science. Start with a one-line program, then use it alongside Go.'}</p><div className="hero-actions"><Link className="button button--dark" href={`${prefix}/docs/getting-started/hello-world`}>{chinese ? '运行第一段代码' : 'Run your first program'} <span aria-hidden="true">→</span></Link><Link className="button button--quiet" href={`${prefix}/docs/getting-started/installation`}>{chinese ? '安装 XGo' : 'Install XGo'}</Link><Link className="button button--quiet" href={`${prefix}/docs`}>{chinese ? '浏览文档' : 'Browse the docs'}</Link></div></div><figure className="hero-code"><figcaption><XGoLogo className="xgo-code-icon" viewBox="4 7 56 18" width={32} height={14} /> hello.xgo</figcaption><pre><code><span className="code-keyword">println</span> <span className="code-string">&quot;Hello world&quot;</span></code></pre><div className="hero-code__output"><span>{chinese ? '输出' : 'Output'}</span><samp>Hello world</samp></div></figure></section>
      <section className="home-guides" aria-labelledby="guides"><h2 id="guides">{chinese ? '浏览指南' : 'Explore the guides'}</h2><div className="route-grid">{routes.map(([title, text, href]) => <Link className="route-card" href={href} key={href}><h3>{title} <span aria-hidden="true">→</span></h3><p>{text}</p></Link>)}</div></section>
    </div>
  );
}
