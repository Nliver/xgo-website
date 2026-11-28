import { createGetUrl } from 'fumadocs-core/source';
import { defineI18n } from 'fumadocs-core/i18n';
import { uiTranslations } from 'fumadocs-ui/i18n';

export const i18n = defineI18n({
  languages: ['en', 'zh-CN'],
  defaultLanguage: 'en',
  parser: 'dir',
  hideLocale: 'default-locale',
  fallbackLanguage: null,
});

export const translations = i18n
  .translations()
  .extend(uiTranslations())
  .add({
    'zh-CN': {
      'Choose a language(language switcher)': '选择语言',
      'Language(language switcher)': '语言',
      'Search(search trigger)': '搜索',
      'Open Search(search trigger)(aria-label)': '打开搜索',
      'Search(search dialog)': '搜索文档',
      'Close Search(search dialog)(aria-label)': '关闭搜索',
      'No results found(search dialog)': '未找到结果',
      'Search failed(search dialog)': '搜索失败',
      'Search failed, showing results for {query}(search dialog)': '搜索失败，当前显示“{query}”的结果',
      'On this page(table of contents)': '本页内容',
      'No Headings(table of contents)': '本页没有章节标题',
      'Table of Contents(inline table of contents)': '目录',
      'Skip to Content(skip link)': '跳至正文',
      'Previous Page(pagination)': '上一篇',
      'Next Page(pagination)': '下一篇',
      'Edit on GitHub(edit page)': '在 GitHub 编辑',
      'Copy Text(code block)(aria-label)': '复制代码',
      'Copied Text(code block)(aria-label)': '已复制代码',
      'Copy Markdown(page actions)': '复制 Markdown',
      'Copied Markdown(page actions)': '已复制 Markdown',
      'Open(page actions)': '打开',
      'Open in GitHub(page actions)': '在 GitHub 查看',
      'View as Markdown(page actions)': '查看 Markdown',
      'Open in ChatGPT(page actions)': '在 ChatGPT 中打开',
      'Open in Claude(page actions)': '在 Claude 中打开',
      'Open in Cursor(page actions)': '在 Cursor 中打开',
      'Read {url}, I want to ask questions about it.(page actions)': '阅读 {url}，我想就这篇文档提问。',
      'Open Sidebar(aria-label)': '打开侧栏',
      'Open Sidebar(sidebar)(aria-label)': '打开侧栏',
      'Close Sidebar(aria-label)': '关闭侧栏',
      'Close Sidebar(sidebar)(aria-label)': '关闭侧栏',
      'Collapse Sidebar(sidebar)(aria-label)': '折叠侧栏',
      'Hide Sidebar(sidebar)': '隐藏侧栏',
      'Show Sidebar(sidebar)': '显示侧栏',
      'Toggle Theme(theme switcher)(aria-label)': '切换主题',
      'Light(theme switcher)(aria-label)': '浅色',
      'Dark(theme switcher)(aria-label)': '深色',
      'System(theme switcher)(aria-label)': '跟随系统',
      'Theme(site menu)': '主题',
      'Options(aria-label)': '选项',
      'Toggle Menu(home layout header)(aria-label)': '展开或收起菜单',
      'Copy Anchor Link(heading anchor)(aria-label)': '复制章节链接',
      'Copied Anchor Link(heading anchor)(aria-label)': '已复制章节链接',
    },
  });

export const appName = 'XGo Documentation';
export const homePaths = { en: '/', 'zh-CN': '/zh-CN' } as const;
export const docsRoute = '/docs';
export const blogRoute = '/blog';
export const docsImageRoute = '/og/docs';
export const siteOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').origin;

const getImageUrl = createGetUrl(docsImageRoute, i18n);

export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'image.png'];
  return { segments, url: getImageUrl(segments, page.locale) };
}
