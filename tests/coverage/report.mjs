import fs from 'node:fs';
import path from 'node:path';
import libCoverage from 'istanbul-lib-coverage';
import libReport from 'istanbul-lib-report';
import reports from 'istanbul-reports';

const root = process.cwd();
const coverage = libCoverage.createCoverageMap({});
for (const directory of ['site', 'scripts']) {
  const file = path.join(root, 'coverage', directory, 'coverage-final.json');
  coverage.merge(JSON.parse(fs.readFileSync(file, 'utf8')));
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.tsx?$|\.d\.ts$/.test(entry.name) ? [file] : [];
  });
}

const expected = [
  ...['app', 'components', 'lib'].flatMap((directory) => sourceFiles(path.join(root, directory))),
  path.join(root, 'proxy.ts'),
  ...fs.readdirSync(path.join(root, 'scripts')).filter((file) => file.endsWith('.mjs') && !/\.(test|spec)\.mjs$/.test(file)).map((file) => path.join(root, 'scripts', file)),
];
const actual = new Set(coverage.files().map((file) => path.resolve(file)));
const missing = expected.filter((file) => !actual.has(file));
const unexpected = [...actual].filter((file) => !expected.includes(file));
if (missing.length || unexpected.length) throw new Error(`Coverage source inventory differs from the runtime source files.\nMissing: ${missing.join(', ')}\nUnexpected: ${unexpected.join(', ')}`);

const context = libReport.createContext({ dir: path.join(root, 'coverage'), coverageMap: coverage });
for (const reporter of ['json', 'json-summary', 'lcovonly', 'text-summary']) {
  reports.create(reporter, { projectRoot: root }).execute(context);
}
const lcov = fs.readFileSync(path.join(root, 'coverage/lcov.info'), 'utf8');
if (/^SF:(?:\/|[A-Za-z]:|\.\.)/m.test(lcov)) throw new Error('LCOV source paths must be relative to the project root.');
console.log(`Merged coverage for all ${expected.length} runtime source files into coverage/lcov.info.`);
