import * as path from 'path';
import { bundleOpenApi } from '../description-parser';
import { generateWorkflowsFromDescription } from './generate-workflows-from-description';
import { generateSecurityInputsArazzoComponents } from './generate-inputs-arazzo-components';

import type { TestDescription } from '../../types';
import type { GenerateArazzoFileOptions } from '../../handlers/generate';

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
  'output-file': outputFile,
}: GenerateArazzoFileOptions) {
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
