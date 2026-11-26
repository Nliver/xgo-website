import manifest from '@/content/sources.json';

type PageSource = {
  sourcePath: string;
  additionalSourcePaths?: string[];
  sourceCommit?: string;
  sourceCheckedAt?: string;
  externalSources?: { repository: string; commit: string; path: string }[];
};

const pages: Record<string, PageSource> = manifest.pages;
export const upstreamUrl = `https://github.com/${manifest.sourceRepository}`;
export const siteRepositoryUrl = 'https://github.com/Nliver/xgo-website';
export const siteRepository = { owner: 'Nliver', repo: 'xgo-website', branch: 'main' } as const;

function getSitePageUrl(operation: 'edit' | 'blob', pagePath: string) {
  const path = pagePath.split('/').map(encodeURIComponent).join('/');
  return `${siteRepositoryUrl}/${operation}/${siteRepository.branch}/content/docs/${path}`;
}

export function getPageEditUrl(pagePath: string) {
  return getSitePageUrl('edit', pagePath);
}

export function getPageGitHubUrl(pagePath: string) {
  return getSitePageUrl('blob', pagePath);
}

export function getPageSources(pagePath: string) {
  const record = pages[`content/docs/${pagePath}`];
  if (!record) throw new Error(`Missing source record for ${pagePath}`);

  const commit = record.sourceCommit ?? manifest.sourceCommit;
  const fileUrl = (path: string) => `${upstreamUrl}/blob/${commit}/${path.split('/').map(encodeURIComponent).join('/')}`;
  return {
    files: [record.sourcePath, ...(record.additionalSourcePaths ?? [])].map((path) => ({ path, url: fileUrl(path) })),
    externalFiles: (record.externalSources ?? []).map(({ repository, commit, path }) => ({
      label: `${repository}/${path}`,
      url: `https://github.com/${repository}/blob/${commit}/${path.split('/').map(encodeURIComponent).join('/')}`,
    })),
    checkedAt: record.sourceCheckedAt ?? manifest.sourceCheckedAt,
    copyright: manifest.sourceCopyright,
    license: manifest.sourceLicense,
    licenseUrl: fileUrl(manifest.licensePath),
  };
}
