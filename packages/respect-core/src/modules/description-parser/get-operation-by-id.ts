import { red } from 'colorette';

import type { SourceDescription, TestContext } from '../../types.js';
import type { OperationDetails } from './get-operation-from-description.js';

// TODO: create a type: ExtendedOpenAPIOperation = OpenAPIOperation & { pathParameters: Parameter[], path, ... }
export function getOperationById(
  operationIdStr: string,
  descriptionDetails: {
    $sourceDescriptions: TestContext['$sourceDescriptions'];
    sourceDescriptions: SourceDescription[] | undefined;
  }
): (OperationDetails & Record<string, any>) | undefined {
  const { $sourceDescriptions: descriptions, sourceDescriptions } = descriptionDetails;
  let descriptionName;
  let operationId;

  if (operationIdStr.includes('$sourceDescriptions.')) {
    const [, sourceDescriptionName, operationIdIdentifier] = operationIdStr.split('.');
    descriptionName = sourceDescriptionName;
    operationId = operationIdIdentifier;
  } else if (!operationIdStr.includes('.')) {
    operationId = operationIdStr;
    descriptionName = findOpenApiDescriptionName(operationId, descriptions, sourceDescriptions);
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

// Only openapi descriptions have operations, and the plain operationId must match exactly one of them.
function findOpenApiDescriptionName(
  operationId: string,
  descriptions: TestContext['$sourceDescriptions'],
  sourceDescriptions: SourceDescription[] = []
): string {
  const matchingDescriptionNames = sourceDescriptions
    .filter(
      ({ type, name }) =>
        type === 'openapi' &&
        Object.values(descriptions[name]?.paths || {}).some((pathDetails) =>
          Object.values(pathDetails || {}).some(
            (operationDetails) => operationDetails?.operationId === operationId
          )
        )
    )
    .map(({ name }) => name);

  if (matchingDescriptionNames.length === 0) {
    throw new Error(
      `Unknown operationId ${red(operationId)}. No openapi source description defines it.`
    );
  }

  if (matchingDescriptionNames.length > 1) {
    throw new Error(
      `The operationId ${red(operationId)} is defined in several source descriptions: ${matchingDescriptionNames.join(
        ', '
      )}. Use ${red(`$sourceDescriptions.<name>.${operationId}`)} to pick one.`
    );
  }

  return matchingDescriptionNames[0];
}
