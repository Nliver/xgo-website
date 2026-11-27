import { defineConfig } from 'fumadocs-mdx/config';
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins';
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

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkFileTrees],
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
