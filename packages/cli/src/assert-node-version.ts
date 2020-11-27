import * as path from 'path';
import { exitWithError } from './utils';

try {
  require('assert-node-version')(path.join(__dirname, '../'));
} catch (err) {
  exitWithError(err.message);
}
