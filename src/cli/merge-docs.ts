import { Config, loadConfig, validate } from '..';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { red, blue } from 'colorette';
import { Oas2Definition } from '../typings/swagger';
import { Oas3Definition } from '../typings/openapi';
import { getFallbackEntryPointsOrExit, handleError, getTotals, printLintTotals } from '../cli';
import { formatProblems } from '../format/format';

type Definition = Oas3Definition | Oas2Definition;

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

export async function handleMerge (argv: { entrypoints: string[] }, version: string) {
  const config: Config = await loadConfig();
  const entrypoints = await getFallbackEntryPointsOrExit(argv.entrypoints, config);

  for (const entryPoint of entrypoints) {
    const isNotOas3 = isNotOas3Definition(entryPoint);
    if (isNotOas3) return stdWriteExit(`File ${entryPoint} should be compatible with OpenAPI Specification`);
    await validateEndpoint(entryPoint, config, version);
  }
}
