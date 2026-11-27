import defaultMdxComponents from 'fumadocs-ui/mdx';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'fumadocs-ui/components/tabs';
import type { MDXComponents } from 'mdx/types';
import { PlatformLogo } from './platform-logo';
import { XGoLogo } from './xgo-logo';
import { RunnableXGo } from './runnable-xgo';
import type { ComponentProps } from 'react';

function DocumentationCodeBlock({ 'data-xgo': isXGoLanguage, children, ...props }: ComponentProps<typeof CodeBlock> & { 'data-xgo'?: boolean }) {
  const filename = typeof props.title === 'string' ? props.title : '';
  const isXGo = isXGoLanguage || filename.endsWith('.xgo') || filename.endsWith('.gox');
  return (
    <CodeBlock
      {...props}
      title={props.title ?? (isXGo ? 'XGo' : undefined)}
      icon={isXGo ? <XGoLogo className="xgo-code-icon" viewBox="4 7 56 18" width={32} height={14} /> : props.icon}
    >
      <Pre>{children}</Pre>
    </CodeBlock>
  );
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    pre: DocumentationCodeBlock,
    File,
    Files,
    Folder,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    PlatformLogo,
    RunnableXGo,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
