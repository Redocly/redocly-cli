import {
  type CollectSpecData,
  HandledError,
  isPlainObject,
  logger,
  parseYaml,
  stringifyYaml,
} from '@redocly/openapi-core';
import { blue, gray, yellow } from 'colorette';
import { writeFileSync } from 'node:fs';

import { type AiProvider } from '../../utils/ai/providers.js';
import { type CommandArgs } from '../../wrapper.js';
import { generateWorkflowsWithAi } from './ai/generate-workflows.js';

export type GenerateArazzoCommandArgv = {
  descriptionPath: string;
  'output-file'?: string;
  'with-ai'?: boolean;
  'ai-provider': AiProvider;
  'max-workflows': number;
  config?: string;
};

const INFERRED_NOTE = '# The workflows below were inferred by AI (--with-ai). Verify before use.\n';

const COMPONENT_INPUT_REF_RE = /^#\/components\/inputs\/(.+)$/;

/**
 * Collect the top-level input property names across all workflows.
 * The generator declares workflow inputs as a $ref into components.inputs,
 * while AI-designed workflows declare them inline as a JSON Schema.
 */
function collectWorkflowInputNames(document: unknown): string[] {
  if (!isPlainObject(document) || !Array.isArray(document.workflows)) {
    return [];
  }
  const componentInputs =
    isPlainObject(document.components) && isPlainObject(document.components.inputs)
      ? document.components.inputs
      : {};

  const names = new Set<string>();
  for (const workflow of document.workflows) {
    if (!isPlainObject(workflow)) {
      continue;
    }
    let inputs = workflow.inputs;
    if (isPlainObject(inputs) && typeof inputs.$ref === 'string') {
      const refMatch = inputs.$ref.match(COMPONENT_INPUT_REF_RE);
      inputs = refMatch ? componentInputs[refMatch[1]] : undefined;
    }
    if (isPlainObject(inputs) && isPlainObject(inputs.properties)) {
      for (const name of Object.keys(inputs.properties)) {
        names.add(name);
      }
    }
  }
  return [...names];
}

export function buildRespectHint(resultYaml: string, outputFile: string): string {
  const inputNames = collectWorkflowInputNames(parseYaml(resultYaml));
  const inputFlags = inputNames
    .map((name) => ` --input ${name}=YOUR_${name.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()}`)
    .join('');
  const replaceNote = inputNames.length
    ? 'Replace the YOUR_* values with real ones; inputs can also come from the REDOCLY_CLI_RESPECT_INPUT environment variable.\n'
    : '';
  return (
    '\nRun the generated workflows against the live API:\n\n' +
    `  npx @redocly/cli@latest respect ${outputFile}${inputFlags}\n\n` +
    replaceNote
  );
}

export async function handleGenerateArazzo({
  argv,
  config,
  version,
  collectSpecData,
}: CommandArgs<GenerateArazzoCommandArgv>) {
  const outputFile = argv['output-file'] || 'auto-generated.arazzo.yaml';

  // The generator reports the bundled OpenAPI document through collectSpecData;
  // capture it so --with-ai can hand it to the AI provider as context.
  let bundledDescription: unknown;
  const collectBundledDescription: CollectSpecData = (document) => {
    bundledDescription = document.parsed;
    collectSpecData?.(document);
  };

  const options = {
    outputFile,
    descriptionPath: argv.descriptionPath,
    collectSpecData: collectBundledDescription,
    version,
    config,
  };

  try {
    const { generate } = await import('@redocly/respect-core');

    logger.info(gray('\n  Generating Arazzo description... \n'));

    const generatedArazzo = await generate(options);
    let resultYaml = stringifyYaml(generatedArazzo);

    if (argv['with-ai']) {
      const provider = argv['ai-provider'];
      logger.info(gray(`\n  Designing workflows with AI provider "${provider}"... \n`));
      logger.warn(
        'Note: --with-ai sends the resolved OpenAPI description to the selected AI provider. Make sure it contains no secrets or personal data you are not allowed to share.\n'
      );

      try {
        const redesigned = await generateWorkflowsWithAi({
          provider,
          baseline: generatedArazzo,
          description: bundledDescription,
          maxWorkflows: argv['max-workflows'],
        });
        resultYaml = INFERRED_NOTE + redesigned.yaml;
        logger.info(`AI designed ${redesigned.workflows} workflow(s) (${provider}).\n`);
      } catch (error) {
        logger.warn(
          `AI workflow design failed, keeping the auto-generated workflows: ${
            error instanceof Error ? error.message : String(error)
          }\n`
        );
      }
    }

    writeFileSync(outputFile, resultYaml);

    logger.info(
      '\n' + blue(`Arazzo description ${yellow(outputFile)} successfully generated.`) + '\n'
    );
    logger.info(buildRespectHint(resultYaml, outputFile));
  } catch (error) {
    throw new HandledError(
      '\n' +
        '❌  Failed to generate Arazzo description. Check the output file path you provided, or the OpenAPI file content.'
    );
  }
}
