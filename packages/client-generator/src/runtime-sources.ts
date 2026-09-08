// The public `@redocly/client-generator/runtime-sources` entry: the embedded-runtime
// source strings for every generator that embeds one. Ejected generator files import these
// instead of baking the runtime in, so embedded-runtime fixes still arrive via
// `npm update` and the ejected file stays small and readable. Pure strings — this
// entry's import graph must stay dependency-free (guarded like the root entry).

export { GO_RUNTIME_SOURCE } from './runtime-sources/go.js';
export { PHP_RUNTIME_SOURCE } from './runtime-sources/php.js';
export { PYTHON_RUNTIME_SOURCES, type PythonRuntimeModuleName } from './runtime-sources/python.js';
export {
  RUNTIME_SOURCES,
  RUNTIME_SOURCES_STRIPPED,
  type RuntimeModuleName,
} from './runtime-sources/typescript.js';
