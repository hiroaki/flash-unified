#!/usr/bin/env node
/*
  FlashUnified all.bundle.js build script

  Purpose:
    - Uses esbuild to bundle all.entry.js and its dependencies into a single ESM file (all.bundle.js).
    - Resolves bare imports like "flash_unified/auto" to local files for Importmap compatibility.
    - Produces a minified, distributable bundle for Rails asset pipeline and Importmap users.

  Usage:
    $ node scripts/build-all-bundle.mjs
    (or via npm run build:bundle)

  Maintenance notes:
    - If you add/remove files in app/javascript/flash_unified, update all.entry.js and check alias plugin logic.
    - The alias plugin assumes all bare imports map to .js files in the same directory.
    - all.bundle.js must be rebuilt and committed before gem release or CI validation.
    - If esbuild or Node.js version changes, test bundle output for compatibility.
    - For advanced scenarios (e.g. excluding network_helpers), adjust all.entry.js and rebuild.
*/
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const sourceDir = path.join(projectRoot, 'app/javascript/flash_unified');
const entryPoint = path.join(sourceDir, 'all.entry.js');
const outputFile = path.join(sourceDir, 'all.bundle.js');

const flashUnifiedAliasPlugin = {
  name: 'flash-unified-alias',
  setup(build) {
    const prefix = 'flash_unified';

    build.onResolve({ filter: /^flash_unified(?:\/.*)?$/ }, (args) => {
      let target;
      if (args.path === prefix) {
        target = 'flash_unified.js';
      } else {
        const suffix = args.path.slice(prefix.length + 1);
        const hasExtension = path.extname(suffix) !== '';
        target = hasExtension ? suffix : `${suffix}.js`;
      }
      return { path: path.join(sourceDir, target) };
    });
  }
};

try {
  await build({
    entryPoints: [entryPoint],
    outfile: outputFile,
    bundle: true,
    format: 'esm',
    minify: true,
    legalComments: 'none',
    plugins: [flashUnifiedAliasPlugin]
  });
  console.log(`[flash-unified] Built ${path.relative(projectRoot, outputFile)}`);
} catch (error) {
  console.error('[flash-unified] Failed to build bundle');
  if (error.errors) {
    error.errors.forEach((err) => console.error(err));
  } else {
    console.error(error);
  }
  process.exitCode = 1;
}
