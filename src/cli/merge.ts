import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { red, blue, yellow } from 'colorette';
import { Config, loadConfig, validate } from '..';
import { Oas2Definition } from '../typings/swagger';
import { Oas3Definition, Oas3Tag } from '../typings/openapi';
import { getFallbackEntryPointsOrExit, handleError, getTotals, printLintTotals } from '../cli';
import { formatProblems } from '../format/format';
import { readYaml, writeYaml } from '../utils';
import { isObject, isString } from '../js-utils';
const isEqual = require('lodash.isequal');

type Definition = Oas3Definition | Oas2Definition;
const COMPONENTS = 'components';

export async function handleMerge (argv: {
  entrypoints: string[],
  lint?: boolean,
  'prefix-tags-with-info-prop'?: string,
  'prefix-components-with-info-prop'?: string
},
  version: string
) {
  const config: Config = await loadConfig();
  const entrypoints = await getFallbackEntryPointsOrExit(argv.entrypoints, config);

  for (const entryPoint of entrypoints) {
    const isNotOas3 = isNotOas3Definition(entryPoint);
    if (isNotOas3) return exitWithError(`File ${entryPoint} does not conform to the OpenAPI Specification. OpenAPI version is not specified.`);
  }

  if (argv.lint) {
    for (const entryPoint of entrypoints) {
      await validateEndpoint(entryPoint, config, version);
    }
  }

  let spec: any = {
    openapi: '3.0.0',
    info: { version: '1.0.0' }
  };
  let potentialConflicts = {
    paths: {},
    operations: {},
    components: {},
    total: 0
  };

  for (const entryPoint of entrypoints) {
    const openapi = readYaml(entryPoint!) as Oas3Definition;
    const { tags, info } = openapi;
    const tagsPrefix = getPrefix(info, argv['prefix-tags-with-info-prop'], 'tags');
    const componentsPrefix = getPrefix(info, argv['prefix-components-with-info-prop'], COMPONENTS);

    if (tags) { populateTags(entryPoint, spec, tags, tagsPrefix); }

    if (info && info.description) {
      const entryPointFileName = getEntryPointFileName(entryPoint);
      const indexGroup = spec['x-tagGroups'].findIndex((item: any) => item.name === entryPointFileName);
      spec['x-tagGroups'][indexGroup]['description'] = info.description;
    }

    if (openapi.hasOwnProperty('x-tagGroups')) {
      process.stderr.write(yellow(`warning: x-tagGroups at ${blue(entryPoint)} will be skipped \n`));
    }

    collectPaths(openapi, entryPoint, spec, potentialConflicts, tagsPrefix);
    collectComponents(openapi, entryPoint, spec, potentialConflicts, componentsPrefix);
    if (componentsPrefix) { replace$Refs(openapi, componentsPrefix); }
  }
  iteratePotentialConflicts(potentialConflicts);
  if (!potentialConflicts.total) { writeYaml(spec, 'openapi.yaml'); }
}

function doesComponentsDiffer(curr: object, next: object) {
  return !isEqual(Object.values(curr)[0], Object.values(next)[0]);
}

function validateComponentsDifference(conflicts: any) {
  let isDiffer = false;
  for (const [_, files] of conflicts) {
    for (let i = 0, len = files.length; i < len; i++) {
      let next = files[i + 1];
      if (next && doesComponentsDiffer(files[i], next)) {
        isDiffer = true;
      }
    }
  }
  return isDiffer;
}

function iteratePotentialConflicts(potentialConflicts: any) {
  for (const [key, value] of Object.entries(potentialConflicts)) {
    const conflicts = filterFiles(value as object);
    if (conflicts.length) {
      potentialConflicts.total = potentialConflicts.total += conflicts.length;
      showConflicts(key, conflicts);
    }
    if (key === COMPONENTS) {
      for (const [key2, value2] of Object.entries(potentialConflicts[key])) {
        const conflicts2 = filterFiles(value2 as object);
        if (conflicts2.length) {
          if (validateComponentsDifference(conflicts2)) {
            conflicts2.map(it => { it[1] = it[1].map((itt: string) => Object.keys(itt)[0]) });
            potentialConflicts.total = potentialConflicts.total += conflicts.length;
            showConflicts(COMPONENTS +'/'+ key2, conflicts2);
          }
        }
      }
    }
    if (key === 'paths') {
      for (const [key3, value3] of Object.entries(potentialConflicts[key])) {
        const conflicts3 = filterFiles(value3 as object);
        if (conflicts3.length) {
          potentialConflicts.total = potentialConflicts.total += conflicts.length;
          showConflicts('paths: '+'/'+ key3, conflicts3);
        }
      }
    }
  }
}

function showConflicts(key: string, conflicts: any) {
  for (const [path, files] of conflicts) {
    process.stderr.write(yellow(`Conflict on ${key} : ${red(path)} in files: ${blue(files)} \n`));
  }
}

function filterFiles(entities: object) {
  return Object.entries(entities).filter(([_, files]) => files.length > 1);
}

function getEntryPointFileName(filePath: string) {
  return path.basename(filePath, path.extname(filePath))
}

function getPrefix(info: any, prefixArg: string | undefined, type: string) {
  if (!prefixArg) return '';
  if (!info[prefixArg]) exitWithError(`prefix-${type}-with-info-prop argument value is not found in info section. \n`);
  return info[prefixArg];
}

function populateTags(entryPoint: string, spec: any, tags: Oas3Tag[], tagsPrefix: string) {
  const xTagGroups = 'x-tagGroups';
  const Tags = 'tags';
  if (!spec.hasOwnProperty(Tags)) { spec[Tags] = []; }
  if (!spec.hasOwnProperty(xTagGroups)) { spec[xTagGroups] = []; }
  const entryPointFileName = getEntryPointFileName(entryPoint);
  if (!spec[xTagGroups].some((g: any) => g.name === entryPointFileName)) {
    spec[xTagGroups].push({ name: entryPointFileName, tags: [] });
  }
  const indexGroup = spec[xTagGroups].findIndex((item: any) => item.name === entryPointFileName);

  for (const tag of tags) {
    const entryPointTagName = tagsPrefix ? tagsPrefix +'_'+ tag.name : entryPointFileName +'_'+ tag.name;
    if (!spec.tags.find((t: any) => t.name === entryPointTagName)) {
      tag['x-displayName'] = tag.name;
      tag.name = entryPointTagName;
      spec.tags.push(tag);
    }

    if (!spec[xTagGroups][indexGroup][Tags].find((t: any) => t === entryPointTagName)) {
      spec[xTagGroups][indexGroup][Tags].push(entryPointTagName);
    }
  }
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

function collectPaths(openapi: Oas3Definition, entryPoint: string, spec: any, potentialConflicts: any, tagsPrefix: string) {
  const { paths } = openapi;
  if (paths) {
    if (!spec.hasOwnProperty('paths')) { spec['paths'] = {}; }
    for (const path of Object.keys(paths)) {
      spec.paths[path] = paths[path];
      if (!potentialConflicts.paths.hasOwnProperty(path)) { potentialConflicts.paths[path] = {}; }
      for (const operation of Object.keys(paths[path])) {
        potentialConflicts.paths[path][operation] = [...(potentialConflicts.paths[path][operation] || []), entryPoint]
        // @ts-ignore
        const { operationId } = paths[path][operation];
        if (operationId) {
          potentialConflicts.operations[operationId] = [...(potentialConflicts.operations[operationId] || []), entryPoint];
        }
      }
      for (const operationKey of Object.keys(spec.paths[path])) {
        let { tags } = spec.paths[path][operationKey];
        if (tags) {
          tags = tags.map((tag: string) => ({ name: tag }));
          populateTags(entryPoint, spec, tags, tagsPrefix);
        }
      }
    }
  }
}

function collectComponents(openapi: Oas3Definition, entryPoint: string, spec: any, potentialConflicts: any, componentsPrefix: string) {
  const { components } = openapi;
  if (components) {
    if (!spec.hasOwnProperty(COMPONENTS)) { spec[COMPONENTS] = {}; }
    for (const component of Object.keys(components)) {
      if (!potentialConflicts[COMPONENTS].hasOwnProperty(component)) {
        potentialConflicts[COMPONENTS][component] = {};
        spec[COMPONENTS][component] = {};
      }
      // @ts-ignore
      for (const item of Object.keys(components[component])) {
        potentialConflicts.components[component][item] = [
          // @ts-ignore
          ...(potentialConflicts.components[component][item] || []), { [entryPoint]: components[component][item]}
        ];
        // @ts-ignore
        spec.components[component][componentsPrefix ? componentsPrefix +'_'+ item : item] = components[component][item];
      }
    }
  }
}

function exitWithError(message: string) {
  process.stderr.write(red(message));
  process.exit(1);
}

function loadFile(fileName: string) {
  try {
    return yaml.safeLoad(fs.readFileSync(fileName, 'utf8')) as Definition;
  } catch (e) {
    return exitWithError(e.message);
  }
}

function isNotOas3Definition(fileName: string) {
  if (!fs.existsSync(fileName)) exitWithError(`File ${blue(fileName)} does not exist \n`);
  const file = loadFile(fileName);
  return !(file as Oas3Definition).openapi;
}

function crawl(object: any, visitor: any) {
  if (!isObject(object)) return;
  for (const key of Object.keys(object)) {
    visitor(object, key);
    crawl(object[key], visitor);
  }
}

function replace$Refs(obj: any, componentsPrefix: string) {
  crawl(obj, (node: any) => {
    if (node.$ref && isString(node.$ref) && node.$ref.startsWith(`#/${COMPONENTS}/`)) {
      const name = path.basename(node.$ref);
      node.$ref = node.$ref.replace(name, componentsPrefix +'_'+ name);
    } else if (
      node.discriminator &&
      node.discriminator.mapping &&
      isObject(node.discriminator.mapping)
    ) {
      const { mapping } = node.discriminator;
      for (const name of Object.keys(mapping)) {
        if (isString(mapping[name]) && mapping[name].startsWith(`#/${COMPONENTS}/`)) {
          mapping[name] = mapping[name].split('/').map((name: string, i: number, arr: []) => {
            return (arr.length - 1 === i && !name.includes(componentsPrefix)) ? componentsPrefix+'_'+name : name;
          }).join('/')
        }
      }
    }
  })
}
