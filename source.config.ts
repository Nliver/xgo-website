import { defineConfig } from 'fumadocs-mdx/config';
import { parseCodeBlockAttributes, rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins';
import { remarkMdxFiles } from 'fumadocs-core/mdx-plugins/remark-mdx-files';
import { replaceSource } from 'fumadocs-core/mdx-plugins/stringifier';
import type { Root } from 'mdast';
import type { LanguageRegistration } from 'shiki';
import type { VFile } from 'vfile';
import xgoGrammar from './lib/grammars/xgo/grammar.json';

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

function remarkRunnableXGo() {
  return (tree: Root, file: VFile) => {
    const path = file.path;
    if (!/(?:^|\/)\(xgo\)\/(?:tutorials\/[^/]+|getting-started\/hello-world|interoperability\/go)(?:\.zh-CN)?\.mdx$/.test(path)) return;
    const locale = path.endsWith('.zh-CN.mdx') ? 'zh-CN' : 'en';
    const sourceBlocks: { index: number; name: string; code: string }[] = [];
    const inserts: { index: number; node: Root['children'][number] }[] = [];

    for (const [index, node] of tree.children.entries()) {
      if (node.type !== 'code') continue;
      if (node.lang === 'xgo' || node.lang === 'go') {
        const { attributes: { title } } = parseCodeBlockAttributes(node.meta ?? '', ['title']);
        const previous = tree.children[index - 1];
        const heading = previous?.type === 'heading' && previous.depth === 3 && previous.children[0]?.type === 'text'
          ? previous.children[0].value
          : '';
        const name = typeof title === 'string' ? title : heading;
        if (/^[a-z0-9-]+\.(?:go|xgo)$/.test(name)) sourceBlocks.push({ index, name, code: node.value });
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
    remarkPlugins: [remarkFileTrees, remarkRunnableXGo],
    rehypeCodeOptions: {
      fallbackLanguage: 'text',
      langs: ['go', { ...xgoGrammar, name: 'xgo', displayName: 'XGo' } as LanguageRegistration],
      transformers: [
        ...rehypeCodeDefaultOptions.transformers ?? [],
        {
          name: 'xgo-code-block',
          pre(node) {
            if (this.options.lang === 'xgo') node.properties['data-xgo'] = true;
          },
        },
      ],
    },
  },
});
