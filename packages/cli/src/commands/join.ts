import * as path from 'path';
import { red, blue, yellow, green } from 'colorette';
import { performance } from 'perf_hooks';
const isEqual = require('lodash.isequal');
import {
  Config,
  Oas3Definition,
  OasVersion,
  BaseResolver,
  Document,
  LintConfig,
  Oas3Tag,
  loadConfig,
  formatProblems,
  getTotals,
  lintDocument,
  detectOpenAPI,
  bundleDocument,
} from '@redocly/openapi-core';

import {
  getFallbackEntryPointsOrExit,
  printExecutionTime,
  handleError,
  printLintTotals,
  writeYaml,
  exitWithError
} from '../utils';
import { isObject, isString } from '../js-utils';

const COMPONENTS = 'components';
let potentialConflictsTotal = 0;

type JoinDocumentContext = {
  entrypoint: string,
  entrypointFilename: string,
  tags: Oas3Tag[],
  potentialConflicts: any,
  tagsPrefix: string,
  componentsPrefix: string | undefined
}

export async function handleJoin (argv: {
  entrypoints: string[],
  lint?: boolean,
  'prefix-tags-with-info-prop'?: string,
  'prefix-tags-with-filename'?: boolean,
  'prefix-components-with-info-prop'?: string
},
packageVersion: string
) {
  const startedAt = performance.now();
  if (argv.entrypoints.length < 2) { return exitWithError(`At least 2 entrypoints should be provided. \n\n`); }

  const config: Config = await loadConfig();
  const entrypoints = await getFallbackEntryPointsOrExit(argv.entrypoints, config);
  const externalRefResolver = new BaseResolver(config.resolve);
  const documents = await Promise.all(
    entrypoints.map(
      ({ path }) => externalRefResolver.resolveDocument(null, path, true) as Promise<Document>
    )
  );

  const bundleResults = await Promise.all(
    documents.map(document => bundleDocument({
      document,
      config: config.lint,
      externalRefResolver
    }).catch(e => {
      exitWithError(`${e.message}: ${blue(document.source.absoluteRef)}`)
    }))
  );

  for (const { problems, bundle: document } of (bundleResults as any)) {
    const fileTotals = getTotals(problems);
    if (fileTotals.errors) {
      formatProblems(problems, {
        totals: fileTotals,
        version: document.parsed.version
      });
      exitWithError(`❌ Errors encountered while bundling ${blue(document.source.absoluteRef)}: join will not proceed.\n`);
    }
  }

  for (const document of documents) {
    try {
      const version = detectOpenAPI(document.parsed)
      if (version !== OasVersion.Version3_0) {
        return exitWithError(`Only OpenAPI 3 is supported: ${blue(document.source.absoluteRef)} \n\n`);
      }
    } catch (e) {
      return exitWithError(`${e.message}: ${blue(document.source.absoluteRef)}`);
    }
  }

  if (argv.lint) {
    for (const document of documents) {
      await validateEntrypoint(document, config.lint, externalRefResolver, packageVersion);
    }
  }

  let joinedDef: any = {};
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

  addInfoSectionAndSpecVersion(documents, prefixComponentsWithInfoProp);

  for (const document of documents) {
    const openapi = document.parsed;
    const { tags, info } = openapi;
    const entrypoint = path.relative(process.cwd(), document.source.absoluteRef);
    const entrypointFilename = getEntrypointFilename(entrypoint);
    const tagsPrefix = prefixTagsWithFilename ? entrypointFilename : getInfoPrefix(info, prefixTagsWithInfoProp, 'tags');
    const componentsPrefix = getInfoPrefix(info, prefixComponentsWithInfoProp, COMPONENTS);

    if (openapi.hasOwnProperty('x-tagGroups')) {
      process.stderr.write(yellow(`warning: x-tagGroups at ${blue(entrypoint)} will be skipped \n`));
    }

    const context = { entrypoint, entrypointFilename, tags, potentialConflicts, tagsPrefix, componentsPrefix };
    if (tags) { populateTags(context); }
    collectServers(openapi);
    collectInfoDescriptions(openapi, context);
    collectExternalDocs(openapi, context);
    collectPaths(openapi, context);
    collectComponents(openapi, context);
    collectXWebhooks(openapi, context);
    if (componentsPrefix) { replace$Refs(openapi, componentsPrefix); }
  }

  iteratePotentialConflicts(potentialConflicts);
  const specFilename = 'openapi.yaml';
  const noRefs = true;
  if (!potentialConflictsTotal) { writeYaml(joinedDef, specFilename, noRefs); }
  printExecutionTime('join', startedAt, specFilename);

  function populateTags({
    entrypoint,
    entrypointFilename,
    tags,
    potentialConflicts,
    tagsPrefix,
    componentsPrefix
  }: JoinDocumentContext) {
    const xTagGroups = 'x-tagGroups';
    const Tags = 'tags';
    if (!joinedDef.hasOwnProperty(Tags)) { joinedDef[Tags] = []; }
    if (!joinedDef.hasOwnProperty(xTagGroups)) { joinedDef[xTagGroups] = []; }
    if (!potentialConflicts.tags.hasOwnProperty('all')) { potentialConflicts.tags['all'] = {}; }
    if (!joinedDef[xTagGroups].some((g: any) => g.name === entrypointFilename)) {
      joinedDef[xTagGroups].push({ name: entrypointFilename, tags: [] });
    }
    const indexGroup = joinedDef[xTagGroups].findIndex((item: any) => item.name === entrypointFilename);
    if (!joinedDef[xTagGroups][indexGroup].hasOwnProperty(Tags)) { joinedDef[xTagGroups][indexGroup][Tags] = []; }
    for (const tag of tags) {
      const entrypointTagName = addPrefix(tag.name, tagsPrefix);
      if (tag.description) {
        tag.description = addComponentsPrefix(tag.description, componentsPrefix!);
      }
      if (!joinedDef.tags.find((t: any) => t.name === entrypointTagName)) {
        tag['x-displayName'] = tag['x-displayName'] || tag.name;
        tag.name = entrypointTagName;
        joinedDef.tags.push(tag);
      }
      if (!joinedDef[xTagGroups][indexGroup][Tags].find((t: any) => t === entrypointTagName)) {
        joinedDef[xTagGroups][indexGroup][Tags].push(entrypointTagName);
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

  function collectServers(openapi: Oas3Definition) {
    const { servers } = openapi;
    if (servers) {
      if (!joinedDef.hasOwnProperty('servers')) { joinedDef['servers'] = []; }
      for (const server of servers) {
        if (!joinedDef.servers.some((s: any) => s.url === server.url)) {
          joinedDef.servers.push(server);
        }
      }
    }
  }

  function collectInfoDescriptions(
    openapi: Oas3Definition,
    {
      entrypointFilename,
      componentsPrefix
    }: JoinDocumentContext
  ) {
    const { info } = openapi;
    if (info?.description) {
      const xTagGroups = 'x-tagGroups';
      const groupIndex = joinedDef[xTagGroups] ? joinedDef[xTagGroups].findIndex((item: any) => item.name === entrypointFilename) : -1;
      if (
        joinedDef.hasOwnProperty(xTagGroups) &&
        groupIndex !== -1 &&
        joinedDef[xTagGroups][groupIndex]['tags'] &&
        joinedDef[xTagGroups][groupIndex]['tags'].length
      ) {
        joinedDef[xTagGroups][groupIndex]['description'] = addComponentsPrefix(info.description, componentsPrefix!);
      }
    }
  }

  function collectExternalDocs(openapi: Oas3Definition, { entrypoint }: JoinDocumentContext) {
    const { externalDocs } = openapi;
    if (externalDocs) {
      if (joinedDef.hasOwnProperty('externalDocs')) {
        process.stderr.write(yellow(`warning: skip externalDocs from ${blue(path.basename(entrypoint))} \n`));
        return;
      }
      joinedDef['externalDocs'] = externalDocs;
    }
  }

  function collectPaths(
    openapi: Oas3Definition,
    {
      entrypointFilename,
      entrypoint,
      potentialConflicts,
      tagsPrefix,
      componentsPrefix
    }: JoinDocumentContext
  ) {
    const { paths } = openapi;
    if (paths) {
      if (!joinedDef.hasOwnProperty('paths')) { joinedDef['paths'] = {}; }
      for (const path of Object.keys(paths)) {
        if (!joinedDef.paths.hasOwnProperty(path)) { joinedDef.paths[path] = {}; }
        if (!potentialConflicts.paths.hasOwnProperty(path)) { potentialConflicts.paths[path] = {}; }
        for (const operation of Object.keys(paths[path])) {
          // @ts-ignore
          const pathOperation = paths[path][operation];
          joinedDef.paths[path][operation] = pathOperation;
          potentialConflicts.paths[path][operation] = [...(potentialConflicts.paths[path][operation] || []), entrypoint];
          const { operationId } = pathOperation;
          if (operationId) {
            if (!potentialConflicts.paths.hasOwnProperty('operationIds')) { potentialConflicts.paths['operationIds'] = {}; }
            potentialConflicts.paths.operationIds[operationId] = [...(potentialConflicts.paths.operationIds[operationId] || []), entrypoint];
          }
          let { tags, security } = joinedDef.paths[path][operation];
          if (tags) {
            joinedDef.paths[path][operation].tags = tags.map((tag: string) => addPrefix(tag, tagsPrefix));
            populateTags({ entrypoint, entrypointFilename, tags: formatTags(tags), potentialConflicts, tagsPrefix, componentsPrefix });
          } else {
            joinedDef.paths[path][operation]['tags'] = [addPrefix('other', tagsPrefix || entrypointFilename)];
            populateTags({ entrypoint, entrypointFilename, tags: formatTags(['other']), potentialConflicts, tagsPrefix: tagsPrefix || entrypointFilename, componentsPrefix });
          }
          if (!security && openapi.hasOwnProperty('security')) {
            joinedDef.paths[path][operation]['security'] = addSecurityPrefix(openapi.security, componentsPrefix!);
          } else if (pathOperation.security) {
            joinedDef.paths[path][operation].security = addSecurityPrefix(pathOperation.security, componentsPrefix!);
          }
        }
      }
    }
  }

  function collectComponents(
    openapi: Oas3Definition,
    {
      entrypoint,
      potentialConflicts,
      componentsPrefix
    }: JoinDocumentContext
  ) {
    const { components } = openapi;
    if (components) {
      if (!joinedDef.hasOwnProperty(COMPONENTS)) { joinedDef[COMPONENTS] = {}; }
      for (const component of Object.keys(components)) {
        if (!potentialConflicts[COMPONENTS].hasOwnProperty(component)) {
          potentialConflicts[COMPONENTS][component] = {};
          joinedDef[COMPONENTS][component] = {};
        }
        // @ts-ignore
        const componentObj = components[component];
        for (const item of Object.keys(componentObj)) {
          const componentPrefix = addPrefix(item, componentsPrefix!);
          potentialConflicts.components[component][componentPrefix] = [
            ...(potentialConflicts.components[component][item] || []), { [entrypoint]: componentObj[item]}
          ];
          joinedDef.components[component][componentPrefix] = componentObj[item];
        }
      }
    }
  }

  function collectXWebhooks(
    openapi: Oas3Definition,
    {
      entrypointFilename,
      entrypoint,
      potentialConflicts,
      tagsPrefix,
      componentsPrefix
    }: JoinDocumentContext
  ) {
    const xWebhooks = 'x-webhooks';
    // @ts-ignore
    const openapiXWebhooks = openapi[xWebhooks];
    if (openapiXWebhooks) {
      if (!joinedDef.hasOwnProperty(xWebhooks)) { joinedDef[xWebhooks] = {}; }
      for (const webhook of Object.keys(openapiXWebhooks)) {
        joinedDef[xWebhooks][webhook] = openapiXWebhooks[webhook];

        if (!potentialConflicts.xWebhooks.hasOwnProperty(webhook)) { potentialConflicts.xWebhooks[webhook] = {}; }
        for (const operation of Object.keys(openapiXWebhooks[webhook])) {
          potentialConflicts.xWebhooks[webhook][operation] = [...(potentialConflicts.xWebhooks[webhook][operation] || []), entrypoint];
        }
        for (const operationKey of Object.keys(joinedDef[xWebhooks][webhook])) {
          let { tags } = joinedDef[xWebhooks][webhook][operationKey];
          if (tags) {
            joinedDef[xWebhooks][webhook][operationKey].tags = tags.map((tag: string) => addPrefix(tag, tagsPrefix));
            populateTags({ entrypoint, entrypointFilename, tags: formatTags(tags), potentialConflicts, tagsPrefix, componentsPrefix });
          }
        }
      }
    }
  }

  function addInfoSectionAndSpecVersion(documents: any, prefixComponentsWithInfoProp: string | undefined) {
    const firstEntrypoint = documents[0];
    const openapi = firstEntrypoint.parsed;
    const componentsPrefix = getInfoPrefix(openapi.info, prefixComponentsWithInfoProp, COMPONENTS);
    if (!openapi.openapi) exitWithError('Version of specification is not found in. \n');
    if (!openapi.info) exitWithError('Info section is not found in specification. \n');
    if (openapi.info?.description) {
      openapi.info.description = addComponentsPrefix(openapi.info.description, componentsPrefix);
    }
    joinedDef.openapi = openapi.openapi;
    joinedDef.info = openapi.info;
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
  return Object.entries(entities).filter(([_, files]) => files.length > 1);
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

async function validateEntrypoint(document: Document, config: LintConfig, externalRefResolver: BaseResolver, packageVersion: string) {
  try {
    const results = await lintDocument({ document, config, externalRefResolver });
    const fileTotals = getTotals(results);
    formatProblems(results, { format: 'stylish', totals: fileTotals, version: packageVersion });
    printLintTotals(fileTotals, 2);
  } catch (err) {
    handleError(err, document.parsed);
  }
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
