import * as path from 'node:path'; //TODO: need to avoid importing path from node:path
import { bundleOpenApi } from '../description-parser/index.js';
import { generateWorkflowsFromDescription } from './generate-workflows-from-description.js';
import { generateSecurityInputsArazzoComponents } from './generate-inputs-arazzo-components.js';

import type { TestDescription } from '../../types.js';
import type { GenerateArazzoOptions } from '../../handlers/generate.js';

export const infoSubstitute = {
  title: '[REPLACE WITH API title]',
  version: '[REPLACE WITH API version]',
};

function resolveDescriptionNameFromPath(descriptionPath: string): string {
  return path
    .parse(descriptionPath)
    .name.replace(/\./g, '-')
    .replace(/[^A-Za-z0-9_-]/g, '');
}

export async function generateArazzoDescription({
  descriptionPath,
  outputFile,
}: GenerateArazzoOptions) {
  const {
    paths: pathsObject,
    info,
    security: rootSecurity,
    components,
  } = (await bundleOpenApi(descriptionPath, '')) || {};

  const sourceDescriptionName = resolveDescriptionNameFromPath(descriptionPath);
  const resolvedDescriptionPath = outputFile
    ? path.relative(path.dirname(outputFile), path.resolve(descriptionPath))
    : descriptionPath;
  const inputsComponents = components?.securitySchemes
    ? generateSecurityInputsArazzoComponents(components?.securitySchemes)
    : undefined;

  const testDescription: TestDescription = {
    arazzo: '1.0.1',
    info: {
      title: info?.title || infoSubstitute.title,
      version: info?.version || infoSubstitute.version,
    },
    sourceDescriptions: [
      {
        name: sourceDescriptionName,
        type: 'openapi',
        url: resolvedDescriptionPath,
      },
    ],
    workflows: generateWorkflowsFromDescription({
      descriptionPaths: pathsObject,
      sourceDescriptionName,
      rootSecurity,
      inputsComponents: inputsComponents || {},
      securitySchemes: components?.securitySchemes,
    }),
    ...(inputsComponents && {
      components: inputsComponents,
    }),
  };

  return JSON.parse(JSON.stringify(testDescription, null, 2));
}
