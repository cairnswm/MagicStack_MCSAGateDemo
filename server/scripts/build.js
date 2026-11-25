// Bundles the whole API (src/**) into a single dist/index.js so FTP deploys
// upload one small file instead of one per module.
// npm packages stay external (the host installs them from dist/package.json).
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

async function build() {
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });

  await esbuild.build({
    entryPoints: [path.join(root, 'src', 'index.ts')],
    outfile: path.join(dist, 'index.js'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    packages: 'external',
    logLevel: 'info',
  });

  fs.cpSync(path.join(root, 'package.json'), path.join(dist, 'package.json'));
  fs.cpSync(path.join(root, '.env'), path.join(dist, '.env'));
  console.log('Built dist/index.js (single-file bundle)');
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
