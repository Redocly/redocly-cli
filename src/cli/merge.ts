import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { red, blue, yellow, green } from 'colorette';
import { Config, loadConfig, validate } from '..';
import { Oas2Definition } from '../typings/swagger';
import { Oas3Definition, Oas3Tag } from '../typings/openapi';
import { getFallbackEntryPointsOrExit, handleError, getTotals, printLintTotals } from '../cli';
import { formatProblems } from '../format/format';
import { printExecutionTime, readYaml, writeYaml } from '../utils';
import { isObject, isString } from '../js-utils';
import { performance } from 'perf_hooks';
const isEqual = require('lodash.isequal');

type Definition = Oas3Definition | Oas2Definition;
const COMPONENTS = 'components';
let potentialConflictsTotal = 0;

export async function handleMerge (argv: {
  entrypoints: string[],
  lint?: boolean,
  'prefix-tags-with-info-prop'?: string,
  'prefix-tags-with-filename'?: boolean,
  'prefix-components-with-info-prop'?: string
},
  version: string
) {
  const startedAt = performance.now();
  if (argv.entrypoints.length < 2) { return exitWithError(`At least 2 files should be provided. \n\n`); }

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

  let spec: any = {};
  let potentialConflicts = {
    tags: {},
    paths: {},
    components: {},
    xWebhooks: {}
  };

  const prefixTagsWithFilename = argv['prefix-tags-with-filename'];
  const prefixTagsWithInfoProp = argv['prefix-tags-with-info-prop'];
  if (prefixTagsWithFilename && prefixTagsWithInfoProp) {
    return exitWithError(
      `You used ${yellow('prefix-tags-with-filename')} and ${yellow('prefix-tags-with-info-prop')} that do not go together.\nPlease choose only one! \n\n`
    );
  }

  addInfoSectionAndSpecVersion(entrypoints, spec);

  for (const entryPoint of entrypoints) {
    const openapi = readYaml(entryPoint!) as Oas3Definition;
    const { tags, info } = openapi;
    const entryPointFileName = getEntryPointFileName(entryPoint);
    const tagsPrefix = prefixTagsWithFilename ? entryPointFileName : getInfoPrefix(info, prefixTagsWithInfoProp, 'tags');
    const componentsPrefix = getInfoPrefix(info, argv['prefix-components-with-info-prop'], COMPONENTS);

    if (openapi.hasOwnProperty('x-tagGroups')) {
      process.stderr.write(yellow(`warning: x-tagGroups at ${blue(entryPoint)} will be skipped \n`));
    }

    if (tags) { populateTags(entryPoint, entryPointFileName, spec, tags, potentialConflicts, tagsPrefix); }
    collectServers(openapi, spec);
    collectInfoDescriptions(info, spec, entryPointFileName);
    collectExternalDocs(openapi, spec, entryPoint);
    collectPaths(openapi, entryPointFileName, entryPoint, spec, potentialConflicts, tagsPrefix);
    collectComponents(openapi, entryPoint, spec, potentialConflicts, componentsPrefix);
    collectXWebhooks(openapi, entryPointFileName, entryPoint, spec, potentialConflicts, tagsPrefix);
    if (componentsPrefix) { replace$Refs(openapi, componentsPrefix); }
  }

  iteratePotentialConflicts(potentialConflicts);
  const specFileName = 'openapi.yaml';
  const noRefs = true;
  if (!potentialConflictsTotal) { writeYaml(spec, specFileName, noRefs); }
  printExecutionTime('merge', startedAt, specFileName);
}

function addInfoSectionAndSpecVersion(entrypoints: any, spec: any) {
  const firstEntryPoint = entrypoints[0];
  const openapi = readYaml(firstEntryPoint) as Oas3Definition;
  if (!openapi.openapi) exitWithError('Version of specification is not found in. \n');
  if (!openapi.info) exitWithError('Info section is not found in specification. \n');
  spec.openapi = openapi.openapi;
  spec.info = openapi.info;
}

function collectServers(openapi: Oas3Definition, spec: any) {
  const { servers } = openapi;
  if (servers) {
    if (!spec.hasOwnProperty('servers')) { spec['servers'] = []; }
    for (const server of servers) {
      if (!spec.servers.some((s: any) => s.url === server.url)) {
        spec.servers.push(server);
      }
    }
  }
}

function doesComponentsDiffer(curr: object, next: object) {
  return !isEqual(Object.values(curr)[0], Object.values(next)[0]);
}

function validateComponentsDifference(files: any) {
  let isDiffer = false;
  for (let i = 0, len = files.length; i < len; i++) {
    let next = files[i + 1];
    if (next && doesComponentsDiffer(files[i], next)) {
      isDiffer = true;
    }
  }
  return isDiffer;
}

function iteratePotentialConflicts(potentialConflicts: any) {
  for (const group of Object.keys(potentialConflicts)) {
    for (const [key, value] of Object.entries(potentialConflicts[group])) {
      const conflicts = filterConflicts(value as object);
      if (conflicts.length) {
        if (group === COMPONENTS) {
          for (const [_, conflict] of Object.entries(conflicts)) {
            if (validateComponentsDifference(conflict[1])) {
              conflict[1] = conflict[1].map((c: string) => Object.keys(c)[0]);
              showConflicts(green(group) + ' => ' + key, [conflict]);
              potentialConflictsTotal += 1;
            }
          }
        } else {
          showConflicts(green(group) +' => '+ key, conflicts);
          potentialConflictsTotal += conflicts.length;
        }
        prefixTagSuggestion(group, conflicts.length);
      }
    }
  }
}

function prefixTagSuggestion(group: string, conflictsLength: number) {
  if (group === 'tags') {
    process.stderr.write(green(`
    ${conflictsLength} conflict(s) on tags.
    Suggestion: please use ${blue('prefix-tags-with-filename')} or ${blue('prefix-tags-with-info-prop')} to prevent naming conflicts. \n\n`
    ));
  }
}

function showConflicts(key: string, conflicts: any) {
  for (const [path, files] of conflicts) {
    process.stderr.write(yellow(`Conflict on ${key} : ${red(path)} in files: ${blue(files)} \n`));
  }
}

function filterConflicts(entities: object) {
  return Object.entries(entities).filter(([key, files]) => key !== 'other' && files.length > 1);
}

function getEntryPointFileName(filePath: string) {
  return path.basename(filePath, path.extname(filePath))
}

function addPrefix(tag: string, tagsPrefix: string) {
  return tagsPrefix ? tagsPrefix +'_'+ tag : tag;
}

function formatTags(tags: string[]) {
  return tags.map((tag: string) => ({ name: tag }));
}

function getInfoPrefix(info: any, prefixArg: string | undefined, type: string) {
  if (!prefixArg) return '';
  if (!info) exitWithError('Info section is not found in specification. \n');
  if (!info[prefixArg]) exitWithError(`${yellow(`prefix-${type}-with-info-prop`)} argument value is not found in info section. \n`);
  if (!isString(info[prefixArg])) exitWithError(`${yellow(`prefix-${type}-with-info-prop`)} argument value should be string. \n\n`);
  if (info[prefixArg].length > 50) exitWithError(`${yellow(`prefix-${type}-with-info-prop`)} argument value length should not exceed 50 characters. \n\n`);
  return info[prefixArg];
}

function populateTags(
  entryPoint: string,
  entryPointFileName: string,
  spec: any,
  tags: Oas3Tag[],
  potentialConflicts: any,
  tagsPrefix: string
) {
  const xTagGroups = 'x-tagGroups';
  const Tags = 'tags';
  if (!spec.hasOwnProperty(Tags)) { spec[Tags] = []; }
  if (!spec.hasOwnProperty(xTagGroups)) { spec[xTagGroups] = []; }
  if (!potentialConflicts.tags.hasOwnProperty('all')) { potentialConflicts.tags['all'] = {}; }
  if (!spec[xTagGroups].some((g: any) => g.name === entryPointFileName)) {
    spec[xTagGroups].push({ name: entryPointFileName, tags: [] });
  }
  const indexGroup = spec[xTagGroups].findIndex((item: any) => item.name === entryPointFileName);
  if (!spec[xTagGroups][indexGroup].hasOwnProperty(Tags)) { spec[xTagGroups][indexGroup][Tags] = []; }
  for (const tag of tags) {
    const entryPointTagName = addPrefix(tag.name, tagsPrefix);
    if (!spec.tags.find((t: any) => t.name === entryPointTagName)) {
      tag['x-displayName'] = tag.name;
      tag.name = entryPointTagName;
      spec.tags.push(tag);
    }
    if (!spec[xTagGroups][indexGroup][Tags].find((t: any) => t === entryPointTagName)) {
      spec[xTagGroups][indexGroup][Tags].push(entryPointTagName);
    }

    const doesEntryPointExist = !potentialConflicts.tags.all[entryPointTagName] || (
      potentialConflicts.tags.all[entryPointTagName] &&
      !potentialConflicts.tags.all[entryPointTagName].includes(entryPoint)
    )
    potentialConflicts.tags.all[entryPointTagName] = [
      ...(potentialConflicts.tags.all[entryPointTagName] || []), ...(doesEntryPointExist ? [entryPoint] : [])
    ];
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

function collectExternalDocs(openapi: Oas3Definition, spec: any, entryPoint: string) {
  const { externalDocs } = openapi;
  if (externalDocs) {
    if (spec.hasOwnProperty('externalDocs')) {
      process.stderr.write(yellow(`warning: skip externalDocs from ${blue(path.basename(entryPoint))} \n`));
      return;
    }
    spec['externalDocs'] = externalDocs;
  }
}

function collectInfoDescriptions(info: any, spec: any, entryPointFileName: string) {
  if (info && info.description) {
    const xTagGroups = 'x-tagGroups';
    const groupIndex = spec[xTagGroups] ? spec[xTagGroups].findIndex((item: any) => item.name === entryPointFileName) : -1;
    if (
      spec.hasOwnProperty(xTagGroups) &&
      groupIndex !== -1 &&
      spec[xTagGroups][groupIndex]['tags'] &&
      spec[xTagGroups][groupIndex]['tags'].length
    ) {
      spec[xTagGroups][groupIndex]['description'] = info.description;
    }
  }
}

function collectPaths(
  openapi: Oas3Definition,
  entryPointFileName: string,
  entryPoint: string,
  spec: any,
  potentialConflicts: any,
  tagsPrefix: string
) {
  const { paths } = openapi;
  if (paths) {
    if (!spec.hasOwnProperty('paths')) { spec['paths'] = {}; }
    for (const path of Object.keys(paths)) {
      if (!spec.paths.hasOwnProperty(path)) { spec.paths[path] = {}; }
      if (!potentialConflicts.paths.hasOwnProperty(path)) { potentialConflicts.paths[path] = {}; }
      for (const operation of Object.keys(paths[path])) {
        // @ts-ignore
        const pathOperation = paths[path][operation];
        spec.paths[path][operation] = pathOperation;
        potentialConflicts.paths[path][operation] = [...(potentialConflicts.paths[path][operation] || []), entryPoint];
        const { operationId } = pathOperation;
        if (operationId) {
          if (!potentialConflicts.paths.hasOwnProperty('operationIds')) { potentialConflicts.paths['operationIds'] = {}; }
          potentialConflicts.paths.operationIds[operationId] = [...(potentialConflicts.paths.operationIds[operationId] || []), entryPoint];
        }
        let { tags, security } = spec.paths[path][operation];
        if (tags) {
          spec.paths[path][operation].tags = tags.map((tag: string) => addPrefix(tag, tagsPrefix));
          populateTags(entryPoint, entryPointFileName, spec, formatTags(tags), potentialConflicts, tagsPrefix);
        } else if (spec.hasOwnProperty('x-tagGroups')) {
          spec.paths[path][operation]['tags'] = [addPrefix('other', tagsPrefix)];
          populateTags(entryPoint, entryPointFileName, spec, formatTags(['other']), potentialConflicts, tagsPrefix);
        }
        if (!security && openapi.hasOwnProperty('security')) {
          spec.paths[path][operation]['security'] = openapi.security;
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
      const componentObj = components[component];
      for (const item of Object.keys(componentObj)) {
        const componentPrefix = addPrefix(item, componentsPrefix);
        potentialConflicts.components[component][componentPrefix] = [
          ...(potentialConflicts.components[component][item] || []), { [entryPoint]: componentObj[item]}
        ];
        spec.components[component][componentPrefix] = componentObj[item];
      }
    }
  }
}

function collectXWebhooks(
  openapi: Oas3Definition,
  entryPointFileName: string,
  entryPoint: string,
  spec: any,
  potentialConflicts: any,
  tagsPrefix: string
) {
  const xWebhooks = 'x-webhooks';
  // @ts-ignore
  const openapiXWebhooks = openapi[xWebhooks];
  if (openapiXWebhooks) {
    if (!spec.hasOwnProperty(xWebhooks)) { spec[xWebhooks] = {}; }
    for (const webhook of Object.keys(openapiXWebhooks)) {
      spec[xWebhooks][webhook] = openapiXWebhooks[webhook];

      if (!potentialConflicts.xWebhooks.hasOwnProperty(webhook)) { potentialConflicts.xWebhooks[webhook] = {}; }
      for (const operation of Object.keys(openapiXWebhooks[webhook])) {
        potentialConflicts.xWebhooks[webhook][operation] = [...(potentialConflicts.xWebhooks[webhook][operation] || []), entryPoint];
      }
      for (const operationKey of Object.keys(spec[xWebhooks][webhook])) {
        let { tags } = spec[xWebhooks][webhook][operationKey];
        if (tags) {
          spec[xWebhooks][webhook][operationKey].tags = tags.map((tag: string) => addPrefix(tag, tagsPrefix));
          populateTags(entryPoint, entryPointFileName, spec, formatTags(tags), potentialConflicts, tagsPrefix);
        }
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
  if (!fs.existsSync(fileName)) exitWithError(`File ${blue(fileName)} does not exist. \n\n`);
  const file = loadFile(fileName);
  if (!file) exitWithError(`File ${blue(fileName)} is empty. \n\n`);
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
