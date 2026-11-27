import type { Metadata } from 'next';
import Link from 'next/link';
import { XGoLogo } from '@/components/xgo-logo';
import { getPageImageUrl, homePaths } from '@/lib/shared';

const description = '从第一个程序开始学习 XGo，并逐步掌握它与 Go 的协作方式。';
const image = getPageImageUrl({ slugs: [], locale: 'zh-CN' }).url;

export const metadata: Metadata = {
  alternates: { canonical: homePaths['zh-CN'], languages: homePaths },
  description,
  openGraph: { type: 'website', url: '/zh-CN', title: 'XGo 文档', description, images: [image] },
  twitter: { card: 'summary_large_image', title: 'XGo 文档', description, images: [image] },
};

const routes = [
  { title: '语言教程', text: '声明变量、格式化字符串，并定义自己的函数。', href: '/zh-CN/docs/tutorials/first-program' },
  { title: '语言参考', text: '查找函数调用、字符串、切片和映射的语法。', href: '/zh-CN/docs/reference/language' },
  { title: '与 Go 协作', text: '使用 Go 包，并在同一个项目中混合 Go 和 XGo 文件。', href: '/zh-CN/docs/interoperability/go' },
  { title: '并发编程', text: '用通道收集 goroutine 的结果，再用 select 读取就绪的通道。', href: '/zh-CN/docs/tutorials/concurrency' },
  { title: '命令行工具', text: '从运行单个文件到构建和测试项目，按任务查找命令。', href: '/zh-CN/docs/toolchain/command-reference' },
  { title: '生态项目', text: '探索 LLGo、iXGo 和使用 SPX 开发游戏的工具。', href: '/zh-CN/docs/ecosystem' },
];

export default function ChineseHomePage() {
  return (
    <div id="main-content" className="home-shell" tabIndex={-1}>
      <section className="home-hero">
        <div>
          <h1>用 <em>XGo</em> 编程</h1>
          <p className="hero-lede">XGo 是一种兼容 Go 的编程语言，适用于工程、STEM 教育和数据科学。从一行程序开始，然后在 Go 项目中使用它。</p>
          <div className="hero-actions">
            <Link className="button button--dark" href="/zh-CN/docs/getting-started/hello-world">运行第一段代码 <span aria-hidden="true">→</span></Link>
            <Link className="button button--quiet" href="/zh-CN/docs/getting-started/installation">安装 XGo</Link>
            <Link className="button button--quiet" href="/zh-CN/docs">浏览文档</Link>
          </div>
        </div>
        <figure className="hero-code">
          <figcaption><XGoLogo className="xgo-code-icon" viewBox="4 7 56 18" width={32} height={14} /> hello.xgo</figcaption>
          <pre><code><span className="code-keyword">println</span> <span className="code-string">&quot;Hello world&quot;</span></code></pre>
          <div className="hero-code__output"><span>输出</span><samp>Hello world</samp></div>
        </figure>
      </section>
      <section className="home-guides" aria-labelledby="guides">
        <h2 id="guides">浏览指南</h2>
        <div className="route-grid">
          {routes.map((route) => (
            <Link className="route-card" href={route.href} key={route.href}>
              <h3>{route.title} <span aria-hidden="true">→</span></h3>
              <p>{route.text}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
