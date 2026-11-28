import manifest from '@/content/sources.json';

type PageSource = {
  sourcePath: string;
  sourceRepository?: string;
  additionalSourcePaths?: string[];
  sourceCommit?: string;
  sourceCheckedAt?: string;
  externalSources?: { repository: string; commit: string; path: string }[];
};

const pages: Record<string, PageSource> = manifest.pages;
export const upstreamUrl = `https://github.com/${manifest.sourceRepository}`;
export const siteRepositoryUrl = 'https://github.com/Nliver/xgo-website';
export const siteRepository = { owner: 'Nliver', repo: 'xgo-website', branch: 'main' } as const;

function getSitePageUrl(operation: 'edit' | 'blob', pagePath: string, locale: 'en' | 'zh-CN' = 'en') {
  pagePath = pagePath.replace(/^(?:en|zh-CN)\//, '');
  const path = pagePath.split('/').map(encodeURIComponent).join('/');
  return `${siteRepositoryUrl}/${operation}/${siteRepository.branch}/content/docs/${locale}/${path}`;
}

export function getPageEditUrl(pagePath: string, locale: 'en' | 'zh-CN' = 'en') {
  return getSitePageUrl('edit', pagePath, locale);
}

export function getPageGitHubUrl(pagePath: string, locale: 'en' | 'zh-CN' = 'en') {
  return getSitePageUrl('blob', pagePath, locale);
}

export function getPageSources(pagePath: string, locale: 'en' | 'zh-CN' = 'en') {
  pagePath = pagePath.replace(/^(?:en|zh-CN)\//, '');
  const record = pages[`content/docs/${locale}/${pagePath}`] ?? pages[`content/docs/${pagePath}`];
  if (!record) throw new Error(`Missing source record for ${pagePath}`);

  const commit = record.sourceCommit ?? manifest.sourceCommit;
  const repository = record.sourceRepository ?? manifest.sourceRepository;
  const repositoryUrl = `https://github.com/${repository}`;
  const fileUrl = (path: string) => `${repositoryUrl}/blob/${commit}/${path.split('/').map(encodeURIComponent).join('/')}`;
  const licenseUrl = `${upstreamUrl}/blob/${manifest.sourceCommit}/${manifest.licensePath.split('/').map(encodeURIComponent).join('/')}`;
  return {
    files: [record.sourcePath, ...(record.additionalSourcePaths ?? [])].map((path) => ({ path, url: fileUrl(path) })),
    externalFiles: (record.externalSources ?? []).map(({ repository, commit, path }) => ({
      label: `${repository}/${path}`,
      url: `https://github.com/${repository}/blob/${commit}/${path.split('/').map(encodeURIComponent).join('/')}`,
    })),
    checkedAt: record.sourceCheckedAt ?? manifest.sourceCheckedAt,
    copyright: manifest.sourceCopyright,
    license: manifest.sourceLicense,
    licenseUrl,
  };
}
