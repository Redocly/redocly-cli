// The public `@redocly/client-generator/runtime-sources` entry: the embedded-runtime
// source strings for the language generators. Ejected generator files import these
// instead of baking the runtime in, so embedded-runtime fixes still arrive via
// `npm update` and the ejected file stays small and readable. Pure strings — this
// entry's import graph must stay dependency-free (guarded like the root entry).

export { GO_RUNTIME_SOURCE } from './emitters/go-runtime-sources.js';
export { PHP_RUNTIME_SOURCE } from './emitters/php-runtime-sources.js';
export {
  PYTHON_RUNTIME_SOURCES,
  type PythonRuntimeModuleName,
} from './emitters/python-runtime-sources.js';
