import manifest from '@/content/sources.json';

type PageSource = {
  sourcePath: string;
  additionalSourcePaths?: string[];
  sourceCommit?: string;
  sourceCheckedAt?: string;
};

const pages: Record<string, PageSource> = manifest.pages;
export const upstreamUrl = `https://github.com/${manifest.sourceRepository}`;

export function getPageSources(pagePath: string) {
  const record = pages[`content/docs/${pagePath}`];
  if (!record) throw new Error(`Missing source record for ${pagePath}`);

  const commit = record.sourceCommit ?? manifest.sourceCommit;
  const fileUrl = (path: string) => `${upstreamUrl}/blob/${commit}/${path.split('/').map(encodeURIComponent).join('/')}`;
  return {
    files: [record.sourcePath, ...(record.additionalSourcePaths ?? [])].map((path) => ({ path, url: fileUrl(path) })),
    checkedAt: record.sourceCheckedAt ?? manifest.sourceCheckedAt,
    copyright: manifest.sourceCopyright,
    license: manifest.sourceLicense,
    licenseUrl: fileUrl(manifest.licensePath),
  };
}
