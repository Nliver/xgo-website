import defaultMdxComponents from 'fumadocs-ui/mdx';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'fumadocs-ui/components/tabs';
import type { MDXComponents } from 'mdx/types';
import { PlatformLogo } from './platform-logo';
import { XGoLogo } from './xgo-logo';
import { RunnableXGo } from './runnable-xgo';
import type { ComponentProps } from 'react';
import { Braces } from 'lucide-react';

type DocumentationCodeBlockProps = ComponentProps<typeof CodeBlock> & {
  'data-language'?: string;
  'data-language-label'?: string;
};

function DocumentationCodeBlock({
  'data-language': language,
  'data-language-label': label,
  title,
  icon,
  children,
  ...props
}: DocumentationCodeBlockProps) {
  const filename = typeof title === 'string' ? title : '';
  const isXGo = language === 'xgo' || filename.endsWith('.xgo') || filename.endsWith('.gox');
  if (isXGo) icon = <XGoLogo viewBox="4 7 56 18" width={24} height={16} />;
  if (language === 'json') icon = <Braces size={16} aria-hidden="true" />;
  return (
    <CodeBlock
      {...props}
      data-language={language}
      title={title ?? (label && <span className="text-xs">{label}</span>)}
      icon={icon}
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
