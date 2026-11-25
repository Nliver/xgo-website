import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="nd-page" tabIndex={-1} className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col justify-center gap-5 px-6">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p>We couldn’t find a page at this address.</p>
      <Link className="underline" href="/docs">Return to the documentation</Link>
    </main>
  );
}
