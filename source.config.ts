import { defineConfig } from 'fumadocs-mdx/config';
import { parseCodeBlockAttributes, rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins';
import { remarkMdxFiles } from 'fumadocs-core/mdx-plugins/remark-mdx-files';
import { replaceSource } from 'fumadocs-core/mdx-plugins/stringifier';
import type { Root } from 'mdast';
import { bundledLanguagesInfo, type LanguageRegistration } from 'shiki';
import type { VFile } from 'vfile';
import xgoGrammar from './lib/grammars/xgo/grammar.json';

const languageNames = new Map<string, string>([['xgo', 'XGo']]);
for (const { id, name, aliases } of bundledLanguagesInfo) {
  for (const key of [id, ...aliases ?? []]) languageNames.set(key, name);
}

function remarkFileTrees() {
  const transform = remarkMdxFiles();
  return async (tree: Root, file: VFile) => {
    const blocks = tree.children.flatMap((node) =>
      node.type === 'code' && node.lang === 'files' && node.value ? [{ node, original: { ...node } }] : [],
    );
    await transform(tree, file, () => {});
    for (const { node, original } of blocks) {
      // The generated component must not replace the authored tree in Markdown.
      delete node.position;
      replaceSource(file, original, ['```text', original.value, '```'].join('\n'), 'markdown');
    }
  };
}

// Some guides introduce a listing with its filename as a Markdown heading.
function remarkCodeFilenames() {
  return (tree: Root) => {
    for (const [index, node] of tree.children.entries()) {
      if (node.type !== 'code') continue;
      const heading = tree.children[index - 1];
      if (heading?.type !== 'heading' || heading.children.length !== 1) continue;
      const name = heading.children[0];
      if (name.type !== 'text' && name.type !== 'inlineCode') continue;
      if (!/^(?:[\w.-]+\/)*[\w.-]+\.[\w-]+$/.test(name.value)) continue;
      if (!parseCodeBlockAttributes(node.meta ?? '', ['title']).attributes.title) {
        node.meta = [node.meta, `title="${name.value}"`].filter(Boolean).join(' ');
      }
    }
  };
}

function remarkRunnableXGo() {
  return (tree: Root, file: VFile) => {
    const normalizedPath = file.path.replaceAll('\\', '/');
    const directoryMatch = normalizedPath.match(/(?:^|\/)content\/docs\/(en|zh-CN)\/(.+\.mdx)$/);
    const legacyMatch = normalizedPath.match(/(?:^|\/)content\/docs\/(.+?)(?:\.(en|zh-CN))?\.mdx$/);
    const locale = directoryMatch?.[1] ?? legacyMatch?.[2] ?? 'en';
    const contentPath = directoryMatch?.[2] ?? `${legacyMatch?.[1] ?? ''}.mdx`;
    if (!/(?:^|\/)\(xgo\)\/(?:tutorials\/[^/]+|getting-started\/hello-world|interoperability\/go)\.mdx$/.test(`/${contentPath}`)) return;
    const sourceBlocks: { index: number; name: string; code: string }[] = [];
    const inserts: { index: number; node: Root['children'][number] }[] = [];

    for (const [index, node] of tree.children.entries()) {
      if (node.type !== 'code') continue;
      if (node.lang === 'xgo' || node.lang === 'go') {
        const { attributes: { title } } = parseCodeBlockAttributes(node.meta ?? '', ['title']);
        if (typeof title === 'string' && /^[a-z0-9-]+\.(?:go|xgo)$/.test(title)) {
          sourceBlocks.push({ index, name: title, code: node.value });
        }
      }
      if (node.lang !== 'text' || sourceBlocks.length === 0) continue;
      const sources = sourceBlocks.splice(0);
      if (!sources.some(({ name }) => name.endsWith('.xgo'))) continue;
      const initialSource = sources.length === 1
        ? sources[0].code
        : sources.map(({ name, code }) => `-- ${name} --\n${code}`).join('\n');
      inserts.push({
        index: sources.at(-1)!.index + 1,
        node: {
          type: 'mdxJsxFlowElement',
          name: 'RunnableXGo',
          attributes: [
            { type: 'mdxJsxAttribute', name: 'initialSource', value: initialSource },
            { type: 'mdxJsxAttribute', name: 'locale', value: locale },
          ],
          children: [],
        },
      });
    }

    for (const { index, node } of inserts.reverse()) tree.children.splice(index, 0, node);
  };
}

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkFileTrees, remarkCodeFilenames, remarkRunnableXGo],
    rehypeCodeOptions: {
      fallbackLanguage: 'text',
      icon: { shortcuts: { powershell: 'shellscript', bat: 'shellscript' } },
      langs: ['go', { ...xgoGrammar, name: 'xgo', displayName: 'XGo' } as LanguageRegistration],
      transformers: [
        ...rehypeCodeDefaultOptions.transformers ?? [],
        {
          name: 'code-block-language',
          pre(node) {
            const language = this.options.lang;
            node.properties['data-language'] = language;
            if (!this.options.meta?.title) node.properties['data-language-label'] = languageNames.get(language);
          },
        },
      ],
    },
  },
});
