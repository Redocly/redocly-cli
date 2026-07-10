import { logger, stringifyYaml } from '@redocly/openapi-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { exitWithError } from '../../utils/error.js';
import type { CommandArgs } from '../../wrapper.js';
import type { TrafficFormat } from '../drift/types/index.js';
import { normalizeFsPath } from '../drift/utils/files.js';
import { type AiProvider } from './ai/providers.js';
import { refineSpecWithAi } from './ai/refine.js';
import { extractSchemaComponents } from './components.js';
import { countOperations, generateSpecFromTraffic } from './generator.js';
import { collectTrafficSamples } from './samples.js';
import { applyValueInference } from './value-inference.js';

export type GenerateSpecArgv = {
  traffic: string;
  type: 'openapi';
  'traffic-format': TrafficFormat;
  server?: string;
  title?: string;
  output?: string;
  'with-ai'?: boolean;
  'ai-provider': AiProvider;
  'ai-model'?: string;
  config?: string;
};

async function writeOutput(outputPath: string, contents: string): Promise<void> {
  const normalized = normalizeFsPath(outputPath);
  await mkdir(path.dirname(normalized), { recursive: true });
  await writeFile(normalized, contents, 'utf8');
}

export async function handleGenerateSpec({ argv }: CommandArgs<GenerateSpecArgv>) {
  if (argv.type !== 'openapi') {
    return exitWithError(`Unsupported spec type "${argv.type}". Only "openapi" is supported.`);
  }

  const trafficPath = normalizeFsPath(argv.traffic);
  const trafficFormat = argv['traffic-format'];

  const baseline = applyValueInference(
    extractSchemaComponents(
      await generateSpecFromTraffic({
        trafficPath,
        format: trafficFormat,
        title: argv.title,
        server: argv.server,
      })
    )
  );

  logger.info(
    `Inferred a baseline OpenAPI description from traffic: ${countOperations(
      baseline
    )} operation(s).\n`
  );

  let resultYaml = stringifyYaml(baseline);

  if (argv['with-ai']) {
    const provider = argv['ai-provider'];
    logger.info(`Refining the description with AI provider "${provider}"...\n`);
    logger.warn(
      'Note: --with-ai sends samples of the recorded traffic (URLs, query strings, request and response bodies) to the selected AI provider. Make sure the traffic contains no secrets or personal data you are not allowed to share.\n'
    );

    const samplesByOperation = await collectTrafficSamples({
      trafficPath,
      format: trafficFormat,
      server: argv.server,
    });

    try {
      const refined = await refineSpecWithAi({
        provider,
        model: argv['ai-model'],
        baseline,
        samplesByOperation,
      });
      resultYaml = refined.yaml;
      logger.info(
        `AI refinement complete: ${refined.refined} of ${refined.total} operation(s) refined (${provider}).\n`
      );
    } catch (error) {
      logger.warn(
        `AI refinement failed, falling back to the baseline description: ${
          error instanceof Error ? error.message : String(error)
        }\n`
      );
    }
  }

  if (argv.output) {
    await writeOutput(argv.output, resultYaml);
    logger.info(`Written to: ${normalizeFsPath(argv.output)}\n`);
    return;
  }

  logger.output(resultYaml);
}
