import defaultMdxComponents from 'fumadocs-ui/mdx';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'fumadocs-ui/components/tabs';
import type { MDXComponents } from 'mdx/types';
import { PlatformLogo } from './platform-logo';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    File,
    Files,
    Folder,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    PlatformLogo,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
