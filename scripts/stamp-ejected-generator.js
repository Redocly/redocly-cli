import fs from 'node:fs';
import path from 'node:path';

// The ejected example declares `requiresGenerator: '^<version>'`, and a 0.x minor release falls
// outside that range, so stamp the example with the version this release ships.
const { version } = JSON.parse(
  fs.readFileSync('./packages/client-generator/package.json', 'utf-8')
);
const generatorDir = './tests/e2e/generate-client/examples/ejected-generator/generators/php';

for (const fileName of fs.readdirSync(generatorDir)) {
  const filePath = path.join(generatorDir, fileName);
  const source = fs.readFileSync(filePath, 'utf-8');
  fs.writeFileSync(
    filePath,
    source
      .replace(/(Ejected from @redocly\/client-generator@)\S+/, `$1${version}`)
      .replace(/(requiresGenerator: '\^)[^']+/, `$1${version}`)
  );
}
