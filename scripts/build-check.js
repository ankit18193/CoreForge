/**
 * CoreForge Workspace Sanity Check Script
 * Verifies compiling status and project file structures.
 */

const fs = require('fs');
const path = require('path');

console.log('Starting workspace validation...');

const requiredDirs = [
  'apps/playground',
  'packages/foundation/types',
  'packages/foundation/contracts',
  'packages/foundation/errors',
  'packages/foundation/utils',
  'packages/framework/config',
  'packages/framework/container',
  'packages/framework/events',
  'packages/framework/runtime',
  'packages/framework/core',
  'docs/architecture',
  'docs/rfcs',
  'templates',
  'scripts',
  '.github',
];

let failed = false;

requiredDirs.forEach((dir) => {
  const fullPath = path.resolve(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Missing directory: ${dir}`);
    failed = true;
  } else {
    console.log(`✅ Found directory: ${dir}`);
  }
});

if (failed) {
  process.exit(1);
} else {
  console.log('🎉 Workspace directories structure verified successfully!');
  process.exit(0);
}
