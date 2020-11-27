import { exitWithError } from './utils';
try {
  require('assert-node-version')()
} catch (err) {
  exitWithError(err.message)
}
