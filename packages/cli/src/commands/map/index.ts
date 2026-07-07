import {
  BaseResolver,
  buildApiMap,
  detectSpec,
  getMajorSpecVersion,
  logger,
  resolveApiMapPointer,
  stringifyYaml,
  type Document,
  type OutputFormat,
} from '@redocly/openapi-core';

import type { VerifyConfigOptions } from '../../types.js';
import { exitWithError } from '../../utils/error.js';
import { getFallbackApisOrExit } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { type AiProvider } from './ai/providers.js';
import { refineSummariesWithAi } from './ai/refine.js';
import { printApiMap } from './print-map/index.js';

const SUPPORTED_MAJOR_VERSIONS = ['oas2', 'oas3', 'async2', 'async3'];

export type MapArgv = {
  api?: string;
  format: OutputFormat;
  'source-locations'?: boolean;
  pointer?: string;
  'with-ai'?: boolean;
  'ai-provider': AiProvider;
  'ai-model'?: string;
} & VerifyConfigOptions;

export async function handleMap({ argv, config, collectSpecData }: CommandArgs<MapArgv>) {
  const [{ path }] = await getFallbackApisOrExit(argv.api ? [argv.api] : [], config);
  const externalRefResolver = new BaseResolver(config.resolve);
  // resolveDocument returns a Document for a readable, parseable file; mirrors lint()
  const document = (await externalRefResolver.resolveDocument(null, path, true)) as Document;
  collectSpecData?.(document.parsed);

  let major;
  try {
    major = getMajorSpecVersion(detectSpec(document.parsed));
  } catch {
    major = undefined;
  }
  if (!major || !SUPPORTED_MAJOR_VERSIONS.includes(major)) {
    exitWithError(
      'The `map` command supports OpenAPI and AsyncAPI descriptions only. Please provide an OpenAPI 2.0-3.2 or AsyncAPI 2.x-3.0 document.'
    );
  }

  if (argv.pointer) {
    const content = await resolveApiMapPointer({
      document,
      config,
      externalRefResolver,
      pointer: argv.pointer,
    });
    if (content === undefined) {
      exitWithError(
        `No content found at pointer ${argv.pointer}. Run the command without --pointer to see the available nodes.`
      );
    }
    logger.output(
      argv.format === 'json' ? JSON.stringify(content, null, 2) : stringifyYaml(content)
    );
    return;
  }

  const apiMap = await buildApiMap({
    document,
    config,
    externalRefResolver,
    sourceLocations: argv['source-locations'],
  });

  if (argv['with-ai']) {
    const provider = argv['ai-provider'];
    try {
      const applied = await refineSummariesWithAi({
        provider,
        model: argv['ai-model'],
        apiMap,
        description: document.source.body,
      });
      logger.info(`AI refinement complete (${provider}): ${applied} summaries updated.\n`);
    } catch (error) {
      logger.info(
        `AI refinement failed, falling back to the deterministic map: ${
          error instanceof Error ? error.message : String(error)
        }\n`
      );
    }
  }

  printApiMap(apiMap, path, argv.format);
}
