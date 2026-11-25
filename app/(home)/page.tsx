import type { Metadata } from 'next';
import Link from 'next/link';
import { getPageImageUrl } from '@/lib/shared';

const description = 'Install XGo, run your first program, and learn how XGo works with Go.';
const image = getPageImageUrl({ slugs: [] }).url;
export const metadata: Metadata = {
  alternates: { canonical: '/' },
  description,
  openGraph: { type: 'website', url: '/', title: 'XGo Documentation', description, images: [image] },
  twitter: { card: 'summary_large_image', title: 'XGo Documentation', description, images: [image] },
};

const routes = [
  { title: 'Language tutorials', text: 'Declare variables, format strings, and define your own functions.', href: '/docs/tutorials/first-program' },
  { title: 'Language reference', text: 'Look up syntax for function calls, strings, slices, and maps.', href: '/docs/reference/language' },
  { title: 'Working with Go', text: 'Use a Go package and build a project with both Go and XGo files.', href: '/docs/interoperability/go' },
];

export default function HomePage() {
  return (
    <div id="main-content" className="home-shell" tabIndex={-1}>
      <section className="home-hero">
        <div>
          <h1>Programming with <em>XGo</em></h1>
          <p className="hero-lede">XGo is a Go-compatible language for engineering, STEM education, and data science. Start with a one-line program, then use it alongside Go.</p>
          <div className="hero-actions">
            <Link className="button button--dark" href="/docs/getting-started/installation">Install XGo <span aria-hidden="true">→</span></Link>
            <Link className="button button--quiet" href="/docs">Browse the docs</Link>
          </div>
        </div>
        <figure className="hero-code">
          <figcaption>hello.xgo</figcaption>
          <pre><code><span className="code-keyword">println</span> <span className="code-string">&quot;Hello world&quot;</span></code></pre>
          <div className="hero-code__output"><span>Output</span><samp>Hello world</samp></div>
        </figure>
      </section>
      <section className="home-guides" aria-labelledby="guides">
        <h2 id="guides">Explore the guides</h2>
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
