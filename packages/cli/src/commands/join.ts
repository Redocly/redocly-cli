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
  StyleguideConfig,
  Oas3Tag,
  formatProblems,
  getTotals,
  lintDocument,
  detectOpenAPI,
  bundleDocument,
} from '@redocly/openapi-core';

import {
  getFallbackApisOrExit,
  printExecutionTime,
  handleError,
  printLintTotals,
  writeYaml,
  exitWithError,
  loadConfigAndHandleErrors,
} from '../utils';
import { isObject, isString, keysOf } from '../js-utils';
import { Oas3Parameter, Oas3PathItem, Oas3Server } from '@redocly/openapi-core/lib/typings/openapi';
import { OPENAPI3_METHOD } from './split/types';

const COMPONENTS = 'components';
const Tags = 'tags';
const xTagGroups = 'x-tagGroups';
let potentialConflictsTotal = 0;

type JoinDocumentContext = {
  api: string;
  apiFilename: string;
  tags: Oas3Tag[];
  potentialConflicts: any;
  tagsPrefix: string;
  componentsPrefix: string | undefined;
};

type JoinArgv = {
  apis: string[];
  lint?: boolean;
  'prefix-tags-with-info-prop'?: string;
  'prefix-tags-with-filename'?: boolean;
  'prefix-components-with-info-prop'?: string;
  'without-x-tag-groups'?: boolean;
  output?: string;
};

export async function handleJoin(argv: JoinArgv, packageVersion: string) {
  const startedAt = performance.now();
  if (argv.apis.length < 2) {
    return exitWithError(`At least 2 apis should be provided. \n\n`);
  }

  const {
    'prefix-components-with-info-prop': prefixComponentsWithInfoProp,
    'prefix-tags-with-filename': prefixTagsWithFilename,
    'prefix-tags-with-info-prop': prefixTagsWithInfoProp,
    'without-x-tag-groups': withoutXTagGroups,
    output: specFilename = 'openapi.yaml',
  } = argv;

  const usedTagsOptions = [
    prefixTagsWithFilename && 'prefix-tags-with-filename',
    prefixTagsWithInfoProp && 'prefix-tags-with-info-prop',
    withoutXTagGroups && 'without-x-tag-groups',
  ].filter(Boolean);

  if (usedTagsOptions.length > 1) {
    return exitWithError(
      `You use ${yellow(usedTagsOptions.join(', '))} together.\nPlease choose only one! \n\n`
    );
  }

  const config: Config = await loadConfigAndHandleErrors();
  const apis = await getFallbackApisOrExit(argv.apis, config);
  const externalRefResolver = new BaseResolver(config.resolve);
  const documents = await Promise.all(
    apis.map(
      ({ path }) => externalRefResolver.resolveDocument(null, path, true) as Promise<Document>
    )
  );

  const bundleResults = await Promise.all(
    documents.map((document) =>
      bundleDocument({
        document,
        config: config.styleguide,
        externalRefResolver,
      }).catch((e) => {
        exitWithError(`${e.message}: ${blue(document.source.absoluteRef)}`);
      })
    )
  );

  for (const { problems, bundle: document } of bundleResults as any) {
    const fileTotals = getTotals(problems);
    if (fileTotals.errors) {
      formatProblems(problems, {
        totals: fileTotals,
        version: document.parsed.version,
      });
      exitWithError(
        `❌ Errors encountered while bundling ${blue(
          document.source.absoluteRef
        )}: join will not proceed.\n`
      );
    }
  }

  for (const document of documents) {
    try {
      const version = detectOpenAPI(document.parsed);
      if (version !== OasVersion.Version3_0) {
        return exitWithError(
          `Only OpenAPI 3 is supported: ${blue(document.source.absoluteRef)} \n\n`
        );
      }
    } catch (e) {
      return exitWithError(`${e.message}: ${blue(document.source.absoluteRef)}`);
    }
  }

  if (argv.lint) {
    for (const document of documents) {
      await validateApi(document, config.styleguide, externalRefResolver, packageVersion);
    }
  }

  const joinedDef: any = {};
  const potentialConflicts = {
    tags: {},
    paths: {},
    components: {},
    xWebhooks: {},
  };

  addInfoSectionAndSpecVersion(documents, prefixComponentsWithInfoProp);

  for (const document of documents) {
    const openapi = document.parsed;
    const { tags, info } = openapi;
    const api = path.relative(process.cwd(), document.source.absoluteRef);
    const apiFilename = getApiFilename(api);
    const tagsPrefix = prefixTagsWithFilename
      ? apiFilename
      : getInfoPrefix(info, prefixTagsWithInfoProp, 'tags');
    const componentsPrefix = getInfoPrefix(info, prefixComponentsWithInfoProp, COMPONENTS);

    if (openapi.hasOwnProperty('x-tagGroups')) {
      process.stderr.write(yellow(`warning: x-tagGroups at ${blue(api)} will be skipped \n`));
    }

    const context = {
      api,
      apiFilename,
      tags,
      potentialConflicts,
      tagsPrefix,
      componentsPrefix,
    };
    if (tags) {
      populateTags(context);
    }
    collectServers(openapi);
    collectInfoDescriptions(openapi, context);
    collectExternalDocs(openapi, context);
    collectPaths(openapi, context);
    collectComponents(openapi, context);
    collectXWebhooks(openapi, context);
    if (componentsPrefix) {
      replace$Refs(openapi, componentsPrefix);
    }
  }

  iteratePotentialConflicts(potentialConflicts, withoutXTagGroups);
  const noRefs = true;

  if (potentialConflictsTotal) {
    return exitWithError(`Please fix conflicts before running ${yellow('join')}.`);
  }

  writeYaml(joinedDef, specFilename, noRefs);
  printExecutionTime('join', startedAt, specFilename);

  function populateTags({
    api,
    apiFilename,
    tags,
    potentialConflicts,
    tagsPrefix,
    componentsPrefix,
  }: JoinDocumentContext) {
    if (!joinedDef.hasOwnProperty(Tags)) {
      joinedDef[Tags] = [];
    }
    if (!potentialConflicts.tags.hasOwnProperty('all')) {
      potentialConflicts.tags['all'] = {};
    }
    if (withoutXTagGroups && !potentialConflicts.tags.hasOwnProperty('description')) {
      potentialConflicts.tags['description'] = {};
    }
    for (const tag of tags) {
      const entrypointTagName = addPrefix(tag.name, tagsPrefix);
      if (tag.description) {
        tag.description = addComponentsPrefix(tag.description, componentsPrefix!);
      }

      const tagDuplicate = joinedDef.tags.find((t: Oas3Tag) => t.name === entrypointTagName);

      if (tagDuplicate && withoutXTagGroups) {
        // If tag already exist and `without-x-tag-groups` option,
        // check if description are different for potential conflicts warning.
        const isTagDescriptionNotEqual =
          tag.hasOwnProperty('description') && tagDuplicate.description !== tag.description;

        potentialConflicts.tags.description[entrypointTagName].push(
          ...(isTagDescriptionNotEqual ? [api] : [])
        );
      } else if (!tagDuplicate) {
        // Instead add tag to joinedDef if there no duplicate;
        tag['x-displayName'] = tag['x-displayName'] || tag.name;
        tag.name = entrypointTagName;
        joinedDef.tags.push(tag);

        if (withoutXTagGroups) {
          potentialConflicts.tags.description[entrypointTagName] = [api];
        }
      }

      if (!withoutXTagGroups) {
        createXTagGroups(apiFilename);
        if (!tagDuplicate) {
          populateXTagGroups(entrypointTagName, getIndexGroup(apiFilename));
        }
      }

      const doesEntrypointExist =
        !potentialConflicts.tags.all[entrypointTagName] ||
        (potentialConflicts.tags.all[entrypointTagName] &&
          !potentialConflicts.tags.all[entrypointTagName].includes(api));
      potentialConflicts.tags.all[entrypointTagName] = [
        ...(potentialConflicts.tags.all[entrypointTagName] || []),
        ...(!withoutXTagGroups && doesEntrypointExist ? [api] : []),
      ];
    }
  }

  function getIndexGroup(apiFilename: string): number {
    return joinedDef[xTagGroups].findIndex((item: any) => item.name === apiFilename);
  }

  function createXTagGroups(apiFilename: string) {
    if (!joinedDef.hasOwnProperty(xTagGroups)) {
      joinedDef[xTagGroups] = [];
    }

    if (!joinedDef[xTagGroups].some((g: any) => g.name === apiFilename)) {
      joinedDef[xTagGroups].push({ name: apiFilename, tags: [] });
    }

    const indexGroup = getIndexGroup(apiFilename);

    if (!joinedDef[xTagGroups][indexGroup].hasOwnProperty(Tags)) {
      joinedDef[xTagGroups][indexGroup][Tags] = [];
    }
  }

  function populateXTagGroups(entrypointTagName: string, indexGroup: number) {
    if (
      !joinedDef[xTagGroups][indexGroup][Tags].find((t: Oas3Tag) => t.name === entrypointTagName)
    ) {
      joinedDef[xTagGroups][indexGroup][Tags].push(entrypointTagName);
    }
  }

  function collectServers(openapi: Oas3Definition) {
    const { servers } = openapi;
    if (servers) {
      if (!joinedDef.hasOwnProperty('servers')) {
        joinedDef['servers'] = [];
      }
      for (const server of servers) {
        if (!joinedDef.servers.some((s: any) => s.url === server.url)) {
          joinedDef.servers.push(server);
        }
      }
    }
  }

  function collectInfoDescriptions(
    openapi: Oas3Definition,
    { apiFilename, componentsPrefix }: JoinDocumentContext
  ) {
    const { info } = openapi;
    if (info?.description) {
      const groupIndex = joinedDef[xTagGroups] ? getIndexGroup(apiFilename) : -1;
      if (
        joinedDef.hasOwnProperty(xTagGroups) &&
        groupIndex !== -1 &&
        joinedDef[xTagGroups][groupIndex]['tags'] &&
        joinedDef[xTagGroups][groupIndex]['tags'].length
      ) {
        joinedDef[xTagGroups][groupIndex]['description'] = addComponentsPrefix(
          info.description,
          componentsPrefix!
        );
      }
    }
  }

  function collectExternalDocs(openapi: Oas3Definition, { api }: JoinDocumentContext) {
    const { externalDocs } = openapi;
    if (externalDocs) {
      if (joinedDef.hasOwnProperty('externalDocs')) {
        process.stderr.write(
          yellow(`warning: skip externalDocs from ${blue(path.basename(api))} \n`)
        );
        return;
      }
      joinedDef['externalDocs'] = externalDocs;
    }
  }

  function collectPaths(
    openapi: Oas3Definition,
    { apiFilename, api, potentialConflicts, tagsPrefix, componentsPrefix }: JoinDocumentContext
  ) {
    const { paths } = openapi;
    const operationsSet = new Set(keysOf<typeof OPENAPI3_METHOD>(OPENAPI3_METHOD));
    if (paths) {
      if (!joinedDef.hasOwnProperty('paths')) {
        joinedDef['paths'] = {};
      }

      for (const path of keysOf(paths)) {
        if (!joinedDef.paths.hasOwnProperty(path)) {
          joinedDef.paths[path] = {};
        }
        if (!potentialConflicts.paths.hasOwnProperty(path)) {
          potentialConflicts.paths[path] = {};
        }

        const pathItem = paths[path] as Oas3PathItem;

        for (const field of keysOf(pathItem)) {
          if (operationsSet.has(field as OPENAPI3_METHOD)) {
            collectPathOperation(pathItem, path, field as OPENAPI3_METHOD);
          }
          if (field === 'servers') {
            collectPathServers(pathItem, path);
          }
          if (field === 'parameters') {
            collectPathParameters(pathItem, path);
          }
          if (typeof pathItem[field] === 'string') {
            collectPathStringFields(pathItem, path, field);
          }
        }
      }
    }

    function collectPathStringFields(
      pathItem: Oas3PathItem,
      path: string | number,
      field: keyof Oas3PathItem
    ) {
      const fieldValue = pathItem[field];
      if (
        joinedDef.paths[path].hasOwnProperty(field) &&
        joinedDef.paths[path][field] !== fieldValue
      ) {
        process.stderr.write(yellow(`warning: different ${field} values in ${path}\n`));
        return;
      }
      joinedDef.paths[path][field] = fieldValue;
    }

    function collectPathServers(pathItem: Oas3PathItem, path: string | number) {
      if (!pathItem.servers) {
        return;
      }

      if (!joinedDef.paths[path].hasOwnProperty('servers')) {
        joinedDef.paths[path].servers = [];
      }

      for (const server of pathItem.servers) {
        let isFoundServer = false;
        for (const pathServer of joinedDef.paths[path].servers) {
          if (pathServer.url === server.url) {
            if (!isServersEqual(pathServer, server)) {
              exitWithError(`Different server values for (${server.url}) in ${path}`);
            }
            isFoundServer = true;
          }
        }

        if (!isFoundServer) {
          joinedDef.paths[path].servers.push(server);
        }
      }
    }

    function collectPathParameters(pathItem: Oas3PathItem, path: string | number) {
      if (!pathItem.parameters) {
        return;
      }
      if (!joinedDef.paths[path].hasOwnProperty('parameters')) {
        joinedDef.paths[path].parameters = [];
      }

      for (const parameter of pathItem.parameters as Oas3Parameter[]) {
        let isFoundParameter = false;
        for (const pathParameter of joinedDef.paths[path].parameters) {
          if (pathParameter.name === parameter.name && pathParameter.in === parameter.in) {
            if (!isEqual(pathParameter.schema, parameter.schema)) {
              exitWithError(`Different parameter schemas for (${parameter.name}) in ${path}`);
            }
            isFoundParameter = true;
          }
        }

        if (!isFoundParameter) {
          joinedDef.paths[path].parameters.push(parameter);
        }
      }
    }

    function collectPathOperation(
      pathItem: Oas3PathItem,
      path: string | number,
      operation: OPENAPI3_METHOD
    ) {
      const pathOperation = pathItem[operation];

      if (!pathOperation) {
        return;
      }

      joinedDef.paths[path][operation] = pathOperation;
      potentialConflicts.paths[path][operation] = [
        ...(potentialConflicts.paths[path][operation] || []),
        api,
      ];

      const { operationId } = pathOperation;

      if (operationId) {
        if (!potentialConflicts.paths.hasOwnProperty('operationIds')) {
          potentialConflicts.paths['operationIds'] = {};
        }
        potentialConflicts.paths.operationIds[operationId] = [
          ...(potentialConflicts.paths.operationIds[operationId] || []),
          api,
        ];
      }

      const { tags, security } = joinedDef.paths[path][operation];

      if (tags) {
        joinedDef.paths[path][operation].tags = tags.map((tag: string) =>
          addPrefix(tag, tagsPrefix)
        );
        populateTags({
          api,
          apiFilename,
          tags: formatTags(tags),
          potentialConflicts,
          tagsPrefix,
          componentsPrefix,
        });
      } else {
        joinedDef.paths[path][operation]['tags'] = [addPrefix('other', tagsPrefix || apiFilename)];
        populateTags({
          api,
          apiFilename,
          tags: formatTags(['other']),
          potentialConflicts,
          tagsPrefix: tagsPrefix || apiFilename,
          componentsPrefix,
        });
      }
      if (!security && openapi.hasOwnProperty('security')) {
        joinedDef.paths[path][operation]['security'] = addSecurityPrefix(
          openapi.security,
          componentsPrefix!
        );
      } else if (pathOperation.security) {
        joinedDef.paths[path][operation].security = addSecurityPrefix(
          pathOperation.security,
          componentsPrefix!
        );
      }
    }
  }

  function isServersEqual(serverOne: Oas3Server, serverTwo: Oas3Server) {
    if (serverOne.description === serverTwo.description) {
      return isEqual(serverOne.variables, serverTwo.variables);
    }

    return false;
  }

  function collectComponents(
    openapi: Oas3Definition,
    { api, potentialConflicts, componentsPrefix }: JoinDocumentContext
  ) {
    const { components } = openapi;
    if (components) {
      if (!joinedDef.hasOwnProperty(COMPONENTS)) {
        joinedDef[COMPONENTS] = {};
      }
      for (const [component, componentObj] of Object.entries(components)) {
        if (!potentialConflicts[COMPONENTS].hasOwnProperty(component)) {
          potentialConflicts[COMPONENTS][component] = {};
          joinedDef[COMPONENTS][component] = {};
        }
        for (const item of Object.keys(componentObj)) {
          const componentPrefix = addPrefix(item, componentsPrefix!);
          potentialConflicts.components[component][componentPrefix] = [
            ...(potentialConflicts.components[component][item] || []),
            { [api]: componentObj[item] },
          ];
          joinedDef.components[component][componentPrefix] = componentObj[item];
        }
      }
    }
  }

  function collectXWebhooks(
    openapi: Oas3Definition,
    { apiFilename, api, potentialConflicts, tagsPrefix, componentsPrefix }: JoinDocumentContext
  ) {
    const xWebhooks = 'x-webhooks';
    const openapiXWebhooks = openapi[xWebhooks];
    if (openapiXWebhooks) {
      if (!joinedDef.hasOwnProperty(xWebhooks)) {
        joinedDef[xWebhooks] = {};
      }
      for (const webhook of Object.keys(openapiXWebhooks)) {
        joinedDef[xWebhooks][webhook] = openapiXWebhooks[webhook];

        if (!potentialConflicts.xWebhooks.hasOwnProperty(webhook)) {
          potentialConflicts.xWebhooks[webhook] = {};
        }
        for (const operation of Object.keys(openapiXWebhooks[webhook])) {
          potentialConflicts.xWebhooks[webhook][operation] = [
            ...(potentialConflicts.xWebhooks[webhook][operation] || []),
            api,
          ];
        }
        for (const operationKey of Object.keys(joinedDef[xWebhooks][webhook])) {
          const { tags } = joinedDef[xWebhooks][webhook][operationKey];
          if (tags) {
            joinedDef[xWebhooks][webhook][operationKey].tags = tags.map((tag: string) =>
              addPrefix(tag, tagsPrefix)
            );
            populateTags({
              api,
              apiFilename,
              tags: formatTags(tags),
              potentialConflicts,
              tagsPrefix,
              componentsPrefix,
            });
          }
        }
      }
    }
  }

  function addInfoSectionAndSpecVersion(
    documents: any,
    prefixComponentsWithInfoProp: string | undefined
  ) {
    const firstApi = documents[0];
    const openapi = firstApi.parsed;
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
    const next = files[i + 1];
    if (next && doesComponentsDiffer(files[i], next)) {
      isDiffer = true;
    }
  }
  return isDiffer;
}

function iteratePotentialConflicts(potentialConflicts: any, withoutXTagGroups?: boolean) {
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
          if (withoutXTagGroups && group === 'tags') {
            duplicateTagDescriptionWarning(conflicts);
          } else {
            potentialConflictsTotal += conflicts.length;
            showConflicts(green(group) + ' => ' + key, conflicts);
          }
        }

        if (group === 'tags' && !withoutXTagGroups) {
          prefixTagSuggestion(conflicts.length);
        }
      }
    }
  }
}

function duplicateTagDescriptionWarning(conflicts: [string, any][]) {
  const tagsKeys = conflicts.map(([tagName]) => `\`${tagName}\``);
  const joinString = yellow(', ');
  process.stderr.write(
    yellow(
      `\nwarning: ${tagsKeys.length} conflict(s) on the ${red(
        tagsKeys.join(joinString)
      )} tags description.\n`
    )
  );
}

function prefixTagSuggestion(conflictsLength: number) {
  process.stderr.write(
    green(
      `\n${conflictsLength} conflict(s) on tags.\nSuggestion: please use ${blue(
        'prefix-tags-with-filename'
      )}, ${blue('prefix-tags-with-info-prop')} or ${blue(
        'without-x-tag-groups'
      )} to prevent naming conflicts.\n\n`
    )
  );
}

function showConflicts(key: string, conflicts: any) {
  for (const [path, files] of conflicts) {
    process.stderr.write(yellow(`Conflict on ${key} : ${red(path)} in files: ${blue(files)} \n`));
  }
}

function filterConflicts(entities: object) {
  return Object.entries(entities).filter(([_, files]) => files.length > 1);
}

function getApiFilename(filePath: string) {
  return path.basename(filePath, path.extname(filePath));
}

function addPrefix(tag: string, tagsPrefix: string) {
  return tagsPrefix ? tagsPrefix + '_' + tag : tag;
}

function formatTags(tags: string[]) {
  return tags.map((tag: string) => ({ name: tag }));
}

function addComponentsPrefix(description: string, componentsPrefix: string) {
  return description.replace(/"(#\/components\/.*?)"/g, (match) => {
    const componentName = path.basename(match);
    return match.replace(componentName, addPrefix(componentName, componentsPrefix));
  });
}

function addSecurityPrefix(security: any, componentsPrefix: string) {
  return componentsPrefix
    ? security?.map((s: any) => {
        const key = Object.keys(s)[0];
        return { [componentsPrefix + '_' + key]: s[key] };
      })
    : security;
}

function getInfoPrefix(info: any, prefixArg: string | undefined, type: string) {
  if (!prefixArg) return '';
  if (!info) exitWithError('Info section is not found in specification. \n');
  if (!info[prefixArg])
    exitWithError(
      `${yellow(`prefix-${type}-with-info-prop`)} argument value is not found in info section. \n`
    );
  if (!isString(info[prefixArg]))
    exitWithError(
      `${yellow(`prefix-${type}-with-info-prop`)} argument value should be string. \n\n`
    );
  if (info[prefixArg].length > 50)
    exitWithError(
      `${yellow(
        `prefix-${type}-with-info-prop`
      )} argument value length should not exceed 50 characters. \n\n`
    );
  return info[prefixArg];
}

async function validateApi(
  document: Document,
  config: StyleguideConfig,
  externalRefResolver: BaseResolver,
  packageVersion: string
) {
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
      node.$ref = node.$ref.replace(name, componentsPrefix + '_' + name);
    } else if (
      node.discriminator &&
      node.discriminator.mapping &&
      isObject(node.discriminator.mapping)
    ) {
      const { mapping } = node.discriminator;
      for (const name of Object.keys(mapping)) {
        if (isString(mapping[name]) && mapping[name].startsWith(`#/${COMPONENTS}/`)) {
          mapping[name] = mapping[name]
            .split('/')
            .map((name: string, i: number, arr: []) => {
              return arr.length - 1 === i && !name.includes(componentsPrefix)
                ? componentsPrefix + '_' + name
                : name;
            })
            .join('/');
        }
      }
    }
  });
}
