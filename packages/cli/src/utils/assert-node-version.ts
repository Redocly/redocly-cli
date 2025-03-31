import * as process from 'node:process';
import * as semver from 'semver';
import { yellow } from 'colorette';
import { engines } from './package.js';

try {
  const range = engines?.node;

  if (typeof range === 'string' && !semver.satisfies(process.version, range)) {
    process.stderr.write(
      yellow(
        `\n⚠️ Warning: failed to satisfy expected node version. Expected: "${range}", Current "${process.version}"\n\n`
      )
    );
  }
} catch (e) {
  // Do nothing
}
