import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { red, blue } from 'colorette';
import { Config, loadConfig, validate } from '..';
import { Oas2Definition } from '../typings/swagger';
import { Oas3Definition } from '../typings/openapi';
import { getFallbackEntryPointsOrExit, handleError, getTotals, printLintTotals } from '../cli';
import { formatProblems } from '../format/format';
import { readYaml } from '../utils';

type Definition = Oas3Definition | Oas2Definition;

export async function handleMerge (argv: { entrypoints: string[] }, version: string) {
  const config: Config = await loadConfig();
  const entrypoints = await getFallbackEntryPointsOrExit(argv.entrypoints, config);

  for (const entryPoint of entrypoints) {
    const isNotOas3 = isNotOas3Definition(entryPoint);
    if (isNotOas3) return stdWriteExit(`File ${entryPoint} should be compatible with OpenAPI Specification`);
    await validateEndpoint(entryPoint, config, version);
  }

  let spec: any = { paths: {}};
  let conflicts: any = { paths: {}};

  for (const entryPoint of entrypoints) {
    const openapi = readYaml(entryPoint!) as Oas3Definition;
    collectPaths(openapi, entryPoint, spec, conflicts);
    collectComponents(openapi, spec);
  }
}

function collectPaths(openapi: Oas3Definition, entryPoint: string, spec: any, conflicts: any) {
  const { paths } = openapi;
  if (paths) {
    for (const path of Object.keys(paths)) {
      if (spec.paths.hasOwnProperty(path)) {
        conflicts.paths[path] = { [entryPoint]: paths[path] };
      } else {
        spec.paths[path] = paths[path];
      }
    }
  }
}
const COMPONENTS = 'components';
function collectComponents(openapi: Oas3Definition, spec: any) {
  const { components } = openapi;
  if (components) {
    if (!spec.hasOwnProperty(COMPONENTS)) { spec[COMPONENTS] = {}; }
    for (const component of Object.keys(components)) {

      // @ts-ignore
      spec[COMPONENTS][component] = { ...spec[COMPONENTS][component], ...components[component]};
    }
  }
}

function stdWriteExit(message: string) {
  process.stderr.write(red(message));
  process.exit(1);
}

function loadFile(fileName: string) {
  try {
    return yaml.safeLoad(fs.readFileSync(fileName, 'utf8')) as Definition;
  } catch (e) {
    return stdWriteExit(e.message);
  }
}

function isNotOas3Definition(fileName: string) {
  if (!fs.existsSync(fileName)) stdWriteExit(`File ${blue(fileName)} does not exist \n`);
  const file = loadFile(fileName);
  return !(file as Oas3Definition).openapi;
}

async function validateEndpoint(entryPoint: string, config: Config, version: string) {
  try {
    const results = await validate({ ref: entryPoint, config });
    const fileTotals = getTotals(results);
    formatProblems(results, { format: 'stylish', totals: fileTotals, version });
    printLintTotals(fileTotals, 2);
  } catch (err) {
    handleError(err, entryPoint);
  }
}
