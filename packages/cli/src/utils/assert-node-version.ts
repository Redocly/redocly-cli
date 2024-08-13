import * as semver from 'semver';
import * as path from 'path';
import * as process from 'process';
import { yellow } from 'colorette';
import fs from 'fs';

const __dirname = import.meta.dirname;

try {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));
  const version = pkg.engines.node;

  if (!semver.satisfies(process.version, version)) {
    process.stderr.write(
      yellow(
        `\n⚠️ Warning: failed to satisfy expected node version. Expected: "${version}", Current "${process.version}"\n\n`
      )
    );
  }
} catch (e) {
  // Do nothing
}
