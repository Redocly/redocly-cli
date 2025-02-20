import * as path from 'path';
import { sortMethods } from '../../utils/sort';
import { bundleOpenApi } from '../description-parser';

import type { OperationMethod, TestDescription, Workflow, Step } from '../../types';
import type { GenerateArazzoFileOptions } from '../../handlers/generate';

type WorkflowsFromDescriptionInput = {
  descriptionPaths: any;
  sourceDescriptionName: string;
};

function generateParametersWithSuccessCriteria(
  responses: any
): [] | { successCriteria: { condition: string }[] } {
  const responseCodesFromDescription = Object.keys(responses || {});

  if (!responseCodesFromDescription.length) {
    return [];
  }

  const firstResponseCode = responseCodesFromDescription?.[0];
  return { successCriteria: [{ condition: `$statusCode == ${firstResponseCode}` }] };
}

function generateOperationId(path: string, method: OperationMethod) {
  return `${method}@${path}`;
}

function generateWorkflowsFromDescription({
  descriptionPaths,
  sourceDescriptionName,
}: WorkflowsFromDescriptionInput): Workflow[] {
  const workflows = [] as Workflow[];

  for (const pathItemKey in descriptionPaths) {
    for (const pathItemObjectKey of Object.keys(descriptionPaths[pathItemKey]).sort(sortMethods)) {
      const keyToCheck = pathItemObjectKey.toLocaleLowerCase();

      if (
        [
          'get',
          'post',
          'put',
          'delete',
          'patch',
          'head',
          'options',
          'trace',
          'connect',
          'query',
        ].includes(keyToCheck.toLocaleLowerCase())
      ) {
        const method = keyToCheck as OperationMethod;
        const pathKey = pathItemKey
          .replace(/^\/|\/$/g, '')
          .split('/')
          .join('-');

        const resolvedOperationId =
          descriptionPaths[pathItemKey][method]?.operationId ||
          generateOperationId(pathItemKey, method);

        workflows.push({
          workflowId: pathKey ? `${method}-${pathKey}-workflow` : `${method}-workflow`,
          steps: [
            {
              stepId: pathKey ? `${method}-${pathKey}-step` : `${method}-step`,
              operationId: `$sourceDescriptions.${sourceDescriptionName}.${resolvedOperationId}`,
              ...generateParametersWithSuccessCriteria(
                descriptionPaths[pathItemKey][method].responses
              ),
            } as unknown as Step,
          ],
        });
      }
    }
  }

  return workflows;
}

export const infoSubstitute = {
  title: '[REPLACE WITH API title]',
  version: '[REPLACE WITH API version]',
};

function resolveDescriptionNameFromPath(descriptionPath: string): string {
  return path.parse(descriptionPath).name;
}

export async function generateArazzoDescription({
  descriptionPath,
  'output-file': outputFile,
}: GenerateArazzoFileOptions) {
  const { paths: pathsObject, info } = (await bundleOpenApi(descriptionPath, '')) || {};
  const sourceDescriptionName = resolveDescriptionNameFromPath(descriptionPath);
  const resolvedDescriptionPath = outputFile
    ? path.relative(path.dirname(outputFile), path.resolve(descriptionPath))
    : descriptionPath;

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
    }),
  };

  return JSON.parse(JSON.stringify(testDescription, null, 2));
}
