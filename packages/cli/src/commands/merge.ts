import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { red, blue, yellow, green } from 'colorette';
import { performance } from 'perf_hooks';
const isEqual = require('lodash.isequal');
import {
  Config,
  loadConfig,
  Oas3Tag,
  Oas2Definition,
  Oas3Definition,
  formatProblems,
  validate
} from "@redocly/openapi-core";
import {
  getFallbackEntryPointsOrExit,
  getTotals,
  printExecutionTime,
  handleError,
  printLintTotals,
  readYaml,
  writeYaml
} from '../utils';
import { isObject, isString } from '../js-utils';

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
  if (argv.entrypoints.length < 2) { return exitWithError(`At least 2 entrypoints should be provided. \n\n`); }

  const config: Config = await loadConfig();
  const entrypoints = await getFallbackEntryPointsOrExit(argv.entrypoints, config);

  for (const entrypoint of entrypoints) {
    const isNotOas3 = isNotOas3Definition(entrypoint);
    if (isNotOas3) return exitWithError(`File ${entrypoint} does not conform to the OpenAPI Specification. OpenAPI version is not specified.`);
  }

  if (argv.lint) {
    for (const entrypoint of entrypoints) {
      await validateEndpoint(entrypoint, config, version);
    }
  }

  let mergedSpec: any = {};
  let potentialConflicts = {
    tags: {},
    paths: {},
    components: {},
    xWebhooks: {}
  };

  const prefixComponentsWithInfoProp = argv['prefix-components-with-info-prop'];
  const prefixTagsWithFilename = argv['prefix-tags-with-filename'];
  const prefixTagsWithInfoProp = argv['prefix-tags-with-info-prop'];
  if (prefixTagsWithFilename && prefixTagsWithInfoProp) {
    return exitWithError(
      `You used ${yellow('prefix-tags-with-filename')} and ${yellow('prefix-tags-with-info-prop')} that do not go together.\nPlease choose only one! \n\n`
    );
  }

  addInfoSectionAndSpecVersion(entrypoints, mergedSpec, prefixComponentsWithInfoProp);

  for (const entrypoint of entrypoints) {
    const openapi = readYaml(entrypoint!) as Oas3Definition;
    const { tags, info } = openapi;
    const entrypointFilename = getEntrypointFilename(entrypoint);
    const tagsPrefix = prefixTagsWithFilename ? entrypointFilename : getInfoPrefix(info, prefixTagsWithInfoProp, 'tags');
    const componentsPrefix = getInfoPrefix(info, prefixComponentsWithInfoProp, COMPONENTS);

    if (openapi.hasOwnProperty('x-tagGroups')) {
      process.stderr.write(yellow(`warning: x-tagGroups at ${blue(entrypoint)} will be skipped \n`));
    }

    if (tags) { populateTags(entrypoint, entrypointFilename, mergedSpec, tags, potentialConflicts, tagsPrefix, componentsPrefix); }
    collectServers(openapi, mergedSpec);
    collectInfoDescriptions(info, mergedSpec, entrypointFilename, componentsPrefix);
    collectExternalDocs(openapi, mergedSpec, entrypoint);
    collectPaths(openapi, entrypointFilename, entrypoint, mergedSpec, potentialConflicts, tagsPrefix, componentsPrefix);
    collectComponents(openapi, entrypoint, mergedSpec, potentialConflicts, componentsPrefix);
    collectXWebhooks(openapi, entrypointFilename, entrypoint, mergedSpec, potentialConflicts, tagsPrefix, componentsPrefix);
    if (componentsPrefix) { replace$Refs(openapi, componentsPrefix); }
  }

  iteratePotentialConflicts(potentialConflicts);
  const specFilename = 'openapi.yaml';
  const noRefs = true;
  if (!potentialConflictsTotal) { writeYaml(mergedSpec, specFilename, noRefs); }
  printExecutionTime('merge', startedAt, specFilename);
}

function addInfoSectionAndSpecVersion(entrypoints: any, mergedSpec: any, prefixComponentsWithInfoProp: string | undefined) {
  const firstEntrypoint = entrypoints[0];
  const openapi = readYaml(firstEntrypoint) as Oas3Definition;
  const componentsPrefix = getInfoPrefix(openapi.info, prefixComponentsWithInfoProp, COMPONENTS);
  if (!openapi.openapi) exitWithError('Version of specification is not found in. \n');
  if (!openapi.info) exitWithError('Info section is not found in specification. \n');
  if (openapi.info?.description) {
    openapi.info.description = addComponentsPrefix(openapi.info.description, componentsPrefix);
  }
  mergedSpec.openapi = openapi.openapi;
  mergedSpec.info = openapi.info;
}

function collectServers(openapi: Oas3Definition, mergedSpec: any) {
  const { servers } = openapi;
  if (servers) {
    if (!mergedSpec.hasOwnProperty('servers')) { mergedSpec['servers'] = []; }
    for (const server of servers) {
      if (!mergedSpec.servers.some((s: any) => s.url === server.url)) {
        mergedSpec.servers.push(server);
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

function getEntrypointFilename(filePath: string) {
  return path.basename(filePath, path.extname(filePath))
}

function addPrefix(tag: string, tagsPrefix: string) {
  return tagsPrefix ? tagsPrefix +'_'+ tag : tag;
}

function formatTags(tags: string[]) {
  return tags.map((tag: string) => ({ name: tag }));
}

function addComponentsPrefix(description: string, componentsPrefix: string) {
  return description.replace(/"(#\/components\/.*?)"/g, (match) => {
    const componentName = path.basename(match);
    return match.replace(componentName, addPrefix(componentName, componentsPrefix));
  })
}

function addSecurityPrefix(security: any, componentsPrefix: string) {
  return componentsPrefix ? security?.map((s: any) => {
    const key = Object.keys(s)[0];
    return { [componentsPrefix +'_'+ key]: s[key] }
  }) : security;
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
  entrypoint: string,
  entrypointFilename: string,
  mergedSpec: any,
  tags: Oas3Tag[],
  potentialConflicts: any,
  tagsPrefix: string,
  componentsPrefix: string
) {
  const xTagGroups = 'x-tagGroups';
  const Tags = 'tags';
  if (!mergedSpec.hasOwnProperty(Tags)) { mergedSpec[Tags] = []; }
  if (!mergedSpec.hasOwnProperty(xTagGroups)) { mergedSpec[xTagGroups] = []; }
  if (!potentialConflicts.tags.hasOwnProperty('all')) { potentialConflicts.tags['all'] = {}; }
  if (!mergedSpec[xTagGroups].some((g: any) => g.name === entrypointFilename)) {
    mergedSpec[xTagGroups].push({ name: entrypointFilename, tags: [] });
  }
  const indexGroup = mergedSpec[xTagGroups].findIndex((item: any) => item.name === entrypointFilename);
  if (!mergedSpec[xTagGroups][indexGroup].hasOwnProperty(Tags)) { mergedSpec[xTagGroups][indexGroup][Tags] = []; }
  for (const tag of tags) {
    const entrypointTagName = addPrefix(tag.name, tagsPrefix);

    if (tag.description) {
      tag.description = addComponentsPrefix(tag.description, componentsPrefix);
    }
    if (!mergedSpec.tags.find((t: any) => t.name === entrypointTagName)) {
      tag['x-displayName'] = tag.name;
      tag.name = entrypointTagName;
      mergedSpec.tags.push(tag);
    }
    if (!mergedSpec[xTagGroups][indexGroup][Tags].find((t: any) => t === entrypointTagName)) {
      mergedSpec[xTagGroups][indexGroup][Tags].push(entrypointTagName);
    }

    const doesEntrypointExist = !potentialConflicts.tags.all[entrypointTagName] || (
      potentialConflicts.tags.all[entrypointTagName] &&
      !potentialConflicts.tags.all[entrypointTagName].includes(entrypoint)
    )
    potentialConflicts.tags.all[entrypointTagName] = [
      ...(potentialConflicts.tags.all[entrypointTagName] || []), ...(doesEntrypointExist ? [entrypoint] : [])
    ];
  }
}

async function validateEndpoint(entrypoint: string, config: Config, version: string) {
  try {
    const results = await validate({ ref: entrypoint, config });
    const fileTotals = getTotals(results);
    formatProblems(results, { format: 'stylish', totals: fileTotals, version });
    printLintTotals(fileTotals, 2);
  } catch (err) {
    handleError(err, entrypoint);
  }
}

function collectExternalDocs(openapi: Oas3Definition, mergedSpec: any, entrypoint: string) {
  const { externalDocs } = openapi;
  if (externalDocs) {
    if (mergedSpec.hasOwnProperty('externalDocs')) {
      process.stderr.write(yellow(`warning: skip externalDocs from ${blue(path.basename(entrypoint))} \n`));
      return;
    }
    mergedSpec['externalDocs'] = externalDocs;
  }
}

function collectInfoDescriptions(info: any, mergedSpec: any, entrypointFilename: string, componentsPrefix: string | undefined) {
  if (info && info.description) {
    const xTagGroups = 'x-tagGroups';
    const groupIndex = mergedSpec[xTagGroups] ? mergedSpec[xTagGroups].findIndex((item: any) => item.name === entrypointFilename) : -1;
    if (
      mergedSpec.hasOwnProperty(xTagGroups) &&
      groupIndex !== -1 &&
      mergedSpec[xTagGroups][groupIndex]['tags'] &&
      mergedSpec[xTagGroups][groupIndex]['tags'].length
    ) {
      mergedSpec[xTagGroups][groupIndex]['description'] = addComponentsPrefix(info.description, componentsPrefix!);
    }
  }
}

function collectPaths(
  openapi: Oas3Definition,
  entrypointFilename: string,
  entrypoint: string,
  mergedSpec: any,
  potentialConflicts: any,
  tagsPrefix: string,
  componentsPrefix: string
) {
  const { paths } = openapi;
  if (paths) {
    if (!mergedSpec.hasOwnProperty('paths')) { mergedSpec['paths'] = {}; }
    for (const path of Object.keys(paths)) {
      if (!mergedSpec.paths.hasOwnProperty(path)) { mergedSpec.paths[path] = {}; }
      if (!potentialConflicts.paths.hasOwnProperty(path)) { potentialConflicts.paths[path] = {}; }
      for (const operation of Object.keys(paths[path])) {
        // @ts-ignore
        const pathOperation = paths[path][operation];
        mergedSpec.paths[path][operation] = pathOperation;
        potentialConflicts.paths[path][operation] = [...(potentialConflicts.paths[path][operation] || []), entrypoint];
        const { operationId } = pathOperation;
        if (operationId) {
          if (!potentialConflicts.paths.hasOwnProperty('operationIds')) { potentialConflicts.paths['operationIds'] = {}; }
          potentialConflicts.paths.operationIds[operationId] = [...(potentialConflicts.paths.operationIds[operationId] || []), entrypoint];
        }
        let { tags, security } = mergedSpec.paths[path][operation];
        if (tags) {
          mergedSpec.paths[path][operation].tags = tags.map((tag: string) => addPrefix(tag, tagsPrefix));
          populateTags(entrypoint, entrypointFilename, mergedSpec, formatTags(tags), potentialConflicts, tagsPrefix, componentsPrefix);
        } else if (mergedSpec.hasOwnProperty('x-tagGroups')) {
          mergedSpec.paths[path][operation]['tags'] = [addPrefix('other', tagsPrefix)];
          populateTags(entrypoint, entrypointFilename, mergedSpec, formatTags(['other']), potentialConflicts, tagsPrefix, componentsPrefix);
        }
        if (!security && openapi.hasOwnProperty('security')) {
          mergedSpec.paths[path][operation]['security'] = addSecurityPrefix(openapi.security, componentsPrefix);
        } else if (pathOperation.security) {
          mergedSpec.paths[path][operation].security = addSecurityPrefix(pathOperation.security, componentsPrefix);
        }
      }
    }
  }
}

function collectComponents(
  openapi: Oas3Definition,
  entrypoint: string,
  mergedSpec: any,
  potentialConflicts: any,
  componentsPrefix: string
) {
  const { components } = openapi;
  if (components) {
    if (!mergedSpec.hasOwnProperty(COMPONENTS)) { mergedSpec[COMPONENTS] = {}; }
    for (const component of Object.keys(components)) {
      if (!potentialConflicts[COMPONENTS].hasOwnProperty(component)) {
        potentialConflicts[COMPONENTS][component] = {};
        mergedSpec[COMPONENTS][component] = {};
      }
      // @ts-ignore
      const componentObj = components[component];
      for (const item of Object.keys(componentObj)) {
        const componentPrefix = addPrefix(item, componentsPrefix);
        potentialConflicts.components[component][componentPrefix] = [
          ...(potentialConflicts.components[component][item] || []), { [entrypoint]: componentObj[item]}
        ];
        mergedSpec.components[component][componentPrefix] = componentObj[item];
      }
    }
  }
}

function collectXWebhooks(
  openapi: Oas3Definition,
  entrypointFileName: string,
  entrypoint: string,
  mergedSpec: any,
  potentialConflicts: any,
  tagsPrefix: string,
  componentsPrefix: string
) {
  const xWebhooks = 'x-webhooks';
  // @ts-ignore
  const openapiXWebhooks = openapi[xWebhooks];
  if (openapiXWebhooks) {
    if (!mergedSpec.hasOwnProperty(xWebhooks)) { mergedSpec[xWebhooks] = {}; }
    for (const webhook of Object.keys(openapiXWebhooks)) {
      mergedSpec[xWebhooks][webhook] = openapiXWebhooks[webhook];

      if (!potentialConflicts.xWebhooks.hasOwnProperty(webhook)) { potentialConflicts.xWebhooks[webhook] = {}; }
      for (const operation of Object.keys(openapiXWebhooks[webhook])) {
        potentialConflicts.xWebhooks[webhook][operation] = [...(potentialConflicts.xWebhooks[webhook][operation] || []), entrypoint];
      }
      for (const operationKey of Object.keys(mergedSpec[xWebhooks][webhook])) {
        let { tags } = mergedSpec[xWebhooks][webhook][operationKey];
        if (tags) {
          mergedSpec[xWebhooks][webhook][operationKey].tags = tags.map((tag: string) => addPrefix(tag, tagsPrefix));
          populateTags(entrypoint, entrypointFileName, mergedSpec, formatTags(tags), potentialConflicts, tagsPrefix, componentsPrefix);
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
