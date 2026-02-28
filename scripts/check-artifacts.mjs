import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ensureFileExists = (relativePath) => {
  const fullPath = resolve(process.cwd(), relativePath);
  if (!existsSync(fullPath)) {
    throw new Error(`Missing required artifact: ${relativePath}`);
  }
};

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));

const exportExpectations = [
  { path: '.', field: 'require', value: './dist/provider/index.js' },
  { path: '.', field: 'import', value: './dist/provider/index.mjs' },
  { path: './strapi-admin', field: 'require', value: './dist/admin/index.js' },
  { path: './strapi-admin', field: 'import', value: './dist/admin/index.mjs' },
  { path: './strapi-server', field: 'require', value: './dist/server/index.js' },
  { path: './strapi-server', field: 'import', value: './dist/server/index.mjs' },
];

const requiredFiles = [...new Set(exportExpectations.map((e) => e.value.replace(/^\.\//, '')))];

for (const relativePath of requiredFiles) {
  ensureFileExists(relativePath);
}

for (const expectation of exportExpectations) {
  const actual = pkg?.exports?.[expectation.path]?.[expectation.field];
  if (actual !== expectation.value) {
    throw new Error(
      `Unexpected exports mapping for ${expectation.path}.${expectation.field}. Expected "${expectation.value}" but got "${actual ?? 'undefined'}"`
    );
  }

  ensureFileExists(expectation.value.replace(/^\.\//, ''));
}

console.log('Artifact and exports checks passed.');
