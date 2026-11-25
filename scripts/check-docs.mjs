import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import GithubSlugger from 'github-slugger';
import { parseDocument } from 'yaml';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';

const processor = unified().use(remarkParse).use(remarkMdx);
const languages = new Set(['go', 'xgo', 'bash', 'sh', 'powershell', 'bat', 'text', 'console', 'json', 'yaml', 'toml', 'ini', 'diff', 'md', 'mdx', 'js', 'javascript', 'ts', 'typescript', 'tsx', 'python', 'c', 'cpp']);

export function collectNodes(node, predicate) {
  const nodes = predicate(node) ? [node] : [];
  for (const child of node.children ?? []) nodes.push(...collectNodes(child, predicate));
  return nodes;
}

export function readPage(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const match = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) throw new Error('missing YAML frontmatter');
  const yaml = parseDocument(match[1], { uniqueKeys: true });
  if (yaml.errors.length) throw new Error(`invalid frontmatter: ${yaml.errors[0].message}`);
  const body = text.slice(match[0].length);
  return { text, body, frontmatter: yaml.toJS(), tree: processor.parse(body) };
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(file) : [file];
  }).sort();
}

function pageUrl(file) {
  const { slug, locale } = pageIdentity(file);
  const pathname = slug.replace(/(^|\/)index$/, '').replace(/\/$/, '');
  return `${locale === 'en' ? '' : `/${locale}`}/docs${pathname ? `/${pathname}` : ''}`;
}

function pageIdentity(file) {
  const name = file.replace(/\.(mdx?|json)$/, '');
  const locale = name.match(/\.(en|zh-CN)$/)?.[1] ?? 'en';
  return { slug: name.replace(/\.(en|zh-CN)$/, ''), locale };
}

function nodeText(node) {
  return node.value ?? (node.children ?? []).map(nodeText).join('');
}

function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

function validSourcePath(value) {
  return typeof value === 'string' && value.length > 0 && !value.startsWith('/') &&
    !value.includes('\\') && !value.split('/').includes('..');
}

function checkFences(body, report) {
  let open;
  for (const [index, line] of body.split('\n').entries()) {
    const fence = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (!fence) continue;
    if (!open) {
      open = { marker: fence[1], line: index + 1 };
      const language = fence[2].trim().split(/\s/)[0];
      if (!language) report(`code fence on body line ${index + 1} is missing a language`);
      else if (!languages.has(language)) report(`unsupported code language ${language}`);
    } else if (fence[1][0] === open.marker[0] && fence[1].length >= open.marker.length && !fence[2].trim()) {
      open = undefined;
    }
  }
  if (open) report(`unclosed code fence on body line ${open.line}`);
}

export function checkDocs(root) {
  const docsRoot = path.join(root, 'content/docs');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/sources.json'), 'utf8'));
  const glossary = JSON.parse(fs.readFileSync(path.join(root, 'content/glossary.json'), 'utf8'));
  const allFiles = listFiles(docsRoot);
  const files = allFiles.filter((file) => /\.mdx?$/.test(file));
  const errors = [];
  const pages = new Map();
  const pageFiles = new Map();
  const report = (file, message) => errors.push(`${file}: ${message}`);
  const shaPattern = /^[a-f0-9]{40}$/;
  if (!/^[\w.-]+\/[\w.-]+$/.test(manifest.sourceRepository ?? '')) report('content/sources.json', 'invalid sourceRepository');
  if (!shaPattern.test(manifest.sourceCommit ?? '')) report('content/sources.json', 'sourceCommit must be a full commit SHA');
  if (!validDate(manifest.sourceCheckedAt)) report('content/sources.json', 'sourceCheckedAt must be an ISO calendar date');
  if (typeof manifest.sourceLicense !== 'string' || !manifest.sourceLicense.trim() || !validSourcePath(manifest.licensePath)) report('content/sources.json', 'missing source license or license path');
  if (!manifest.pages || Array.isArray(manifest.pages) || typeof manifest.pages !== 'object') throw new Error('content/sources.json: pages must be an object');

  for (const file of files) {
    const localPath = path.relative(docsRoot, file).replaceAll(path.sep, '/');
    const relative = path.relative(root, file).replaceAll(path.sep, '/');
    const url = pageUrl(localPath);
    const fail = (message) => report(relative, message);
    const { slug, locale } = pageIdentity(localPath);
    if (!slug.split('/').every((part) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(part))) fail('slug must use lowercase words separated by hyphens');
    if (pages.has(url)) fail(`duplicate URL ${url}`);
    let page;
    try { page = readPage(file); } catch (error) { fail(error.message); continue; }
    const { frontmatter, body, tree } = page;
    for (const field of ['title', 'description']) if (typeof frontmatter?.[field] !== 'string' || !frontmatter[field].trim()) fail(`missing or invalid ${field}`);
    const headings = collectNodes(tree, (node) => node.type === 'heading');
    const slugger = new GithubSlugger();
    const anchors = new Set();
    let previousDepth = 1;
    for (const heading of headings) {
      if (heading.depth === 1) fail('body h1 duplicates the page title rendered by Fumadocs');
      if (heading.depth > previousDepth + 1) fail(`heading level jumps from h${previousDepth} to h${heading.depth}`);
      previousDepth = heading.depth;
      anchors.add(slugger.slug(nodeText(heading)));
    }
    checkFences(body, fail);
    const prose = collectNodes(tree, (node) => node.type === 'text').map(nodeText).join('\n');
    if (locale === 'en' && /[\u4e00-\u9fff]/u.test(prose)) fail('Chinese prose detected in the English edition');
    for (const term of glossary.terms ?? []) {
      for (const forbidden of term.forbidden ?? []) {
        const escaped = forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`\\b${escaped}\\b`, 'u').test(prose)) fail(`use ${term.canonical} instead of ${forbidden}`);
      }
    }
    const metadata = manifest.pages[relative];
    if (!metadata) fail('missing source metadata');
    else {
      if (!validSourcePath(metadata.sourcePath)) fail('invalid sourcePath');
      if (metadata.additionalSourcePaths && (!Array.isArray(metadata.additionalSourcePaths) || !metadata.additionalSourcePaths.every(validSourcePath))) fail('invalid additionalSourcePaths');
      if (!['tutorial', 'reference', 'guide', 'example'].includes(metadata.contentType)) fail('invalid contentType');
      if (!['upstream-synced', 'editorial', 'original'].includes(metadata.sourceStatus)) fail('invalid sourceStatus');
      if (!['draft', 'technical-review', 'english-review', 'published'].includes(metadata.reviewStatus)) fail('invalid reviewStatus');
      if (typeof metadata.applicableVersion !== 'string' || !metadata.applicableVersion.trim()) fail('missing applicableVersion');
      if (metadata.sourceCommit && !shaPattern.test(metadata.sourceCommit)) fail('invalid sourceCommit override');
      if (metadata.sourceCheckedAt && !validDate(metadata.sourceCheckedAt)) fail('invalid sourceCheckedAt override');
      if (metadata.locale !== undefined && metadata.locale !== locale) fail('source locale does not match the page locale');
      if (locale !== 'en') {
        const original = `content/docs/${slug}.mdx`;
        if (metadata.translationOf !== original || !manifest.pages[original]) fail('translationOf must reference the corresponding English page');
        if (!['pending', 'reviewed'].includes(metadata.translationReviewStatus)) fail('invalid translationReviewStatus');
      }
      if (metadata.candidateSourceCommit !== undefined && !shaPattern.test(metadata.candidateSourceCommit)) fail('invalid candidateSourceCommit');
      const sourcePaths = [metadata.sourcePath, ...(Array.isArray(metadata.additionalSourcePaths) ? metadata.additionalSourcePaths : [])];
      if (metadata.candidateChangedSources !== undefined && (!Array.isArray(metadata.candidateChangedSources) || !metadata.candidateChangedSources.every((source) => validSourcePath(source) && [...sourcePaths, manifest.licensePath].includes(source)))) fail('invalid candidateChangedSources');
      if (metadata.upstreamSnippets !== undefined) {
        if (!Array.isArray(metadata.upstreamSnippets)) fail('upstreamSnippets must be an array');
        else {
          const snippetIds = new Set();
          for (const mapping of metadata.upstreamSnippets) {
            if (!mapping || typeof mapping !== 'object' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(mapping.id ?? '') || snippetIds.has(mapping.id)) { fail('invalid or duplicate upstream snippet id'); continue; }
            snippetIds.add(mapping.id);
            if (!sourcePaths.includes(mapping.sourcePath)) fail(`upstream snippet ${mapping.id} must use a mapped sourcePath`);
            if (typeof mapping.heading !== 'string' || !mapping.heading.trim() || !Number.isInteger(mapping.codeBlockIndex) || mapping.codeBlockIndex < 0) fail(`invalid upstream snippet selector ${mapping.id}`);
            const start = `{/* upstream-snippet:${mapping.id}:start */}`;
            const end = `{/* upstream-snippet:${mapping.id}:end */}`;
            if (body.split(start).length !== 2 || body.split(end).length !== 2 || body.indexOf(start) >= body.indexOf(end)) fail(`invalid upstream snippet markers ${mapping.id}`);
            else {
              const snippetBody = body.slice(body.indexOf(start) + start.length, body.indexOf(end));
              if (collectNodes(processor.parse(snippetBody), (node) => node.type === 'code').length !== 1) fail(`upstream snippet ${mapping.id} must contain one code block`);
            }
          }
        }
      }
    }
    pages.set(url, { ...page, relative, file, anchors });
    pageFiles.set(localPath, url);
  }

  for (const relative of Object.keys(manifest.pages)) {
    if (!files.some((file) => path.relative(root, file).replaceAll(path.sep, '/') === relative)) report(relative, 'source metadata points to a missing page');
  }

  for (const [url, page] of pages) {
    const links = collectNodes(page.tree, (node) => node.type === 'link' || node.type === 'image').map((node) => node.url);
    const definitions = new Map(collectNodes(page.tree, (node) => node.type === 'definition').map((node) => [node.identifier, node.url]));
    for (const reference of collectNodes(page.tree, (node) => ['linkReference', 'imageReference'].includes(node.type))) {
      const target = definitions.get(reference.identifier);
      if (target) links.push(target);
      else report(page.relative, `unresolved link reference ${reference.identifier}`);
    }
    for (const node of collectNodes(page.tree, (node) => node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement')) {
      for (const attribute of node.attributes ?? []) if (['href', 'src'].includes(attribute.name) && typeof attribute.value === 'string') links.push(attribute.value);
    }
    for (const href of links) {
      if (!href || href.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(href)) continue;
      const destination = new URL(href, `https://docs.invalid${url}`);
      let targetPath = destination.pathname.replace(/\/$/, '') || '/';
      if (/\.mdx?$/.test(targetPath) || href.startsWith('.')) {
        const targetFile = path.posix.normalize(path.posix.join(path.posix.dirname(path.relative(docsRoot, page.file).replaceAll(path.sep, '/')), href.split(/[?#]/)[0]));
        targetPath = pageFiles.get(targetFile) ?? targetPath;
      }
      if (href.startsWith('#')) targetPath = url;
      if (/^(?:\/zh-CN)?\/docs(?:\/|$)/.test(targetPath)) {
        const target = pages.get(targetPath);
        if (!target) report(page.relative, `internal link points to missing page ${href}`);
        else if (destination.hash && !target.anchors.has(decodeURIComponent(destination.hash.slice(1)))) report(page.relative, `internal link points to missing heading ${href}`);
      } else if (targetPath !== '/') {
        const asset = path.join(root, 'public', targetPath);
        if (!fs.existsSync(asset)) report(page.relative, `internal link or asset is missing ${href}`);
      }
    }
  }

  for (const file of allFiles.filter((file) => /^meta(?:\.(?:en|zh-CN))?\.json$/.test(path.basename(file)))) {
    const relative = path.relative(root, file).replaceAll(path.sep, '/');
    const { locale } = pageIdentity(file);
    let meta;
    try { meta = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { report(relative, 'invalid JSON'); continue; }
    if (typeof meta.title !== 'string' || !meta.title.trim()) report(relative, 'missing navigation title');
    if (!Array.isArray(meta.pages)) { report(relative, 'pages must be an array'); continue; }
    for (const entry of meta.pages) {
      if (typeof entry !== 'string') { report(relative, 'navigation entries must be strings'); continue; }
      if (entry === '...' || entry.startsWith('---') || entry.startsWith('[')) continue;
      const target = path.resolve(path.dirname(file), entry.replace(/^!/, '').replace(/\/\*$/, ''));
      const suffix = locale === 'en' ? '' : `.${locale}`;
      if (!target.startsWith(docsRoot + path.sep) && target !== docsRoot) report(relative, `navigation escapes content directory ${entry}`);
      else if (!fs.existsSync(target) && !fs.existsSync(`${target}${suffix}.mdx`) && !fs.existsSync(`${target}${suffix}.md`)) report(relative, `navigation target is missing ${entry}`);
    }
  }
  return { errors, count: files.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { errors, count } = checkDocs(path.resolve(process.argv[2] ?? process.cwd()));
    if (errors.length) { console.error(errors.map((error) => `- ${error}`).join('\n')); process.exitCode = 1; }
    else console.log(`Checked ${count} documentation pages, source records, links, and navigation.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
