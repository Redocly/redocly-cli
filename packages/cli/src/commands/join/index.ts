import {
  BaseResolver,
  formatProblems,
  getTotals,
  detectSpec,
  bundleDocument,
  logger,
  isPlainObject,
  isEmptyObject,
  getTypes,
} from '@redocly/openapi-core';
import type { Document, BundleResult, Oas3Server, SpecVersion } from '@redocly/openapi-core';
import { blue, yellow } from 'colorette';
import * as path from 'node:path';
import { performance } from 'node:perf_hooks';

import { exitWithError } from '../../utils/error.js';
import {
  getFallbackApisOrExit,
  printExecutionTime,
  sortTopLevelKeysForOas,
  getAndValidateFileExtension,
  writeToFileByExtension,
} from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { COMPONENTS } from '../split/types.js';
import {
  replace$Refs,
  getInfoPrefix,
  getApiFilename,
  iteratePotentialConflicts,
  populateTags,
  collectExternalDocs,
  collectPaths,
  collectComponents,
  collectWebhooks,
  addInfoSectionAndSpecVersion,
} from './helpers/index.js';
import type { JoinArgv, AnyOas3Definition } from './types.js';

export async function handleJoin({
  argv,
  config,
  version: packageVersion,
  collectSpecData,
}: CommandArgs<JoinArgv>) {
  const startedAt = performance.now();

  const {
    'prefix-components-with-info-prop': prefixComponentsWithInfoProp,
    'prefix-tags-with-filename': prefixTagsWithFilename,
    'prefix-tags-with-info-prop': prefixTagsWithInfoProp,
    'without-x-tag-groups': withoutXTagGroups,
    output,
  } = argv;

  const usedTagsOptions = [
    prefixTagsWithFilename && 'prefix-tags-with-filename',
    prefixTagsWithInfoProp && 'prefix-tags-with-info-prop',
    withoutXTagGroups && 'without-x-tag-groups',
  ].filter(Boolean);

  if (usedTagsOptions.length > 1) {
    return exitWithError(
      `You use ${yellow(usedTagsOptions.join(', '))} together.\nPlease choose only one!`
    );
  }

  const apis = await getFallbackApisOrExit(argv.apis, config);
  if (apis.length < 2) {
    return exitWithError(`At least 2 APIs should be provided.`);
  }

  const fileExtension = getAndValidateFileExtension(output || apis[0].path);
  const specFilename = output || `openapi.${fileExtension}`;

  const externalRefResolver = new BaseResolver(config.resolve);
  const documents = await Promise.all(
    apis.map(
      ({ path }) => externalRefResolver.resolveDocument(null, path, true) as Promise<Document>
    )
  );

  const decorators = new Set([
    ...Object.keys(config.decorators.oas3_0),
    ...Object.keys(config.decorators.oas3_1),
    ...Object.keys(config.decorators.oas2),
  ]);
  config.skipDecorators(Array.from(decorators));

  const preprocessors = new Set([
    ...Object.keys(config.preprocessors.oas3_0),
    ...Object.keys(config.preprocessors.oas3_1),
    ...Object.keys(config.preprocessors.oas2),
  ]);
  config.skipPreprocessors(Array.from(preprocessors));

  const bundleResults = await Promise.all(
    documents.map((document) =>
      bundleDocument({
        document,
        config,
        externalRefResolver: new BaseResolver(config.resolve),
        types: getTypes(detectSpec(document.parsed)),
      }).catch((e) => {
        exitWithError(`${e.message}: ${blue(document.source.absoluteRef)}`);
      })
    )
  );

  for (const { problems, bundle: document } of bundleResults as BundleResult[]) {
    const fileTotals = getTotals(problems);
    if (fileTotals.errors) {
      formatProblems(problems, {
        totals: fileTotals,
        version: packageVersion,
        command: 'join',
      });
      exitWithError(
        `❌ Errors encountered while bundling ${blue(
          document.source.absoluteRef
        )}: join will not proceed.`
      );
    }
  }

  let oasVersion: SpecVersion | null = null;
  for (const document of documents) {
    try {
      const version = detectSpec(document.parsed);
      collectSpecData?.(document.parsed);
      if (version !== 'oas3_0' && version !== 'oas3_1' && version !== 'oas3_2') {
        return exitWithError(
          `Only OpenAPI 3.0, 3.1, and 3.2 are supported: ${blue(document.source.absoluteRef)}.`
        );
      }

      oasVersion = oasVersion ?? version;
      if (oasVersion !== version) {
        return exitWithError(
          `All APIs must use the same OpenAPI version: ${blue(document.source.absoluteRef)}.`
        );
      }
    } catch (e) {
      return exitWithError(`${e.message}: ${blue(document.source.absoluteRef)}.`);
    }
  }

  const [first, ...others] = (documents ?? []) as Document<AnyOas3Definition>[];
  const serversAreTheSame = others.every(({ parsed: { paths, servers } }) => {
    // include only documents with paths
    if (!paths || isEmptyObject(paths || {})) {
      return true;
    }
    return servers?.every((server: Oas3Server) =>
      first.parsed.servers?.find(({ url }: Oas3Server) => url === server.url)
    );
  });

  const joinedDef: any = {};
  const potentialConflicts = {
    tags: {},
    paths: {},
    components: {},
    webhooks: {},
  };

  addInfoSectionAndSpecVersion(joinedDef, documents, prefixComponentsWithInfoProp);

  if (serversAreTheSame && first.parsed.servers) {
    joinedDef.servers = first.parsed.servers;
  }

  for (const document of documents) {
    const openapi = isPlainObject<AnyOas3Definition>(document.parsed)
      ? document.parsed
      : ({} as AnyOas3Definition);
    const { tags, info } = openapi;
    const api = path.relative(process.cwd(), document.source.absoluteRef);
    const apiFilename = getApiFilename(api);
    const tagsPrefix = prefixTagsWithFilename
      ? apiFilename
      : getInfoPrefix(info, prefixTagsWithInfoProp, 'tags');
    const componentsPrefix = getInfoPrefix(info, prefixComponentsWithInfoProp, COMPONENTS);

    if (openapi.hasOwnProperty('x-tagGroups')) {
      logger.warn(`warning: x-tagGroups at ${blue(api)} will be skipped \n`);
    }

    const context = {
      api,
      apiFilename,
      apiTitle: info?.title,
      tags,
      potentialConflicts,
      tagsPrefix,
      componentsPrefix,
      oasVersion,
    };
    if (tags) {
      populateTags({ joinedDef, withoutXTagGroups, context });
    }
    collectExternalDocs({ joinedDef, openapi, context });
    collectPaths({ joinedDef, withoutXTagGroups, openapi, context, serversAreTheSame });
    collectComponents({ joinedDef, openapi, context });
    collectWebhooks({ joinedDef, withoutXTagGroups, openapi, context });
    if (componentsPrefix) {
      replace$Refs(openapi, componentsPrefix);
    }
  }

  const potentialConflictsTotal = iteratePotentialConflicts({
    potentialConflicts,
    withoutXTagGroups,
  });
  const noRefs = true;

  if (potentialConflictsTotal) {
    return exitWithError(`Please fix conflicts before running ${yellow('join')}.`);
  }

  writeToFileByExtension(sortTopLevelKeysForOas(joinedDef), specFilename, noRefs);

  printExecutionTime('join', startedAt, specFilename);
}
