import { getPath } from '../../utils/path.js';
import { bundleOpenApi } from '../description-parser/index.js';
import { generateWorkflowsFromDescription } from './generate-workflows-from-description.js';
import { generateSecurityInputsArazzoComponents } from './generate-inputs-arazzo-components.js';
import { type TestDescription } from '../../types.js';
import { type GenerateArazzoOptions } from '../../handlers/generate.js';

export const infoSubstitute = {
  title: '[REPLACE WITH API title]',
  version: '[REPLACE WITH API version]',
};

async function resolveDescriptionNameFromPath(descriptionPath: string): Promise<string> {
  const path = await getPath();
  return path
    .parse(descriptionPath)
    .name.replace(/\./g, '-')
    .replace(/[^A-Za-z0-9_-]/g, '');
}

export async function generateArazzoDescription(opts: GenerateArazzoOptions) {
  const path = await getPath();
  const { descriptionPath, outputFile, collectSpecData } = opts;
  const document = (await bundleOpenApi(opts)) || {};
  collectSpecData?.(document);

  const { paths: pathsObject, info, security: rootSecurity, components } = document;
  const sourceDescriptionName = await resolveDescriptionNameFromPath(descriptionPath);
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
