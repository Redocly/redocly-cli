import { red } from 'colorette';

import type { OperationDetails } from './get-operation-from-description.js';

// TODO: create a type: ExtendedOpenAPIOperation = OpenAPIOperation & { pathParameters: Parameter[], path, ... }
export function getOperationById(
  operationIdStr: string,
  descriptions: any
): (OperationDetails & Record<string, any>) | undefined {
  let descriptionName;
  let operationId;

  if (operationIdStr.includes('$sourceDescriptions.')) {
    const [, sourceDescriptionName, operationIdIdentifier] = operationIdStr.split('.');
    descriptionName = sourceDescriptionName;
    operationId = operationIdIdentifier;
  } else if (!operationIdStr.includes('.')) {
    operationId = operationIdStr;
    descriptionName = Object.keys(descriptions)[0];
  } else {
    [descriptionName, operationId] = operationIdStr.split('.');
  }

  const availableDescriptions = Object.keys(descriptions);

  if (!descriptions[descriptionName]) {
    throw new Error(
      `Unknown description name ${red(descriptionName)} at ${red(
        operationIdStr
      )}. Available descriptions: ${availableDescriptions.join(', ')}.`
    );
  }

  const description = descriptions[descriptionName];
  const securitySchemes = description?.components?.securitySchemes;
  const rootServers = description.servers;

  for (const [path, pathDetails] of Object.entries(descriptions[descriptionName].paths)) {
    if (!pathDetails) {
      return undefined;
    }

    for (const [method, operationDetails] of Object.entries(pathDetails)) {
      if (operationDetails.operationId === operationId) {
        return {
          servers: (pathDetails as any).servers || rootServers,
          ...operationDetails,
          pathParameters: operationDetails.parameters || [],
          path,
          method,
          descriptionName,
          securitySchemes,
        };
      }
    }
  }

  throw new Error(`Unknown operationId ${red(operationId)} at ${red(operationIdStr)}.`);
}
