import { red } from 'colorette';

import type { OperationDetails } from './get-operation-from-description';
import type { SourceDescription } from '../../types';

const JsonPointerLib = require('json-pointer');

export function getOperationByPath(
  operationPath: string,
  descriptionDetails: {
    $sourceDescriptions: any;
    sourceDescriptions: SourceDescription[] | undefined;
  },
): (OperationDetails & Record<string, string>) | undefined {
  const { $sourceDescriptions, sourceDescriptions } = descriptionDetails;
  const [basePath, fragmentIdentifier] = operationPath.split('#');

  if (!sourceDescriptions) {
    throw new Error(`Missing described sourceDescriptions`);
  }

  const descriptionName = sourceDescriptions.find((sourceDescription) => {
    if (['openapi', 'arazzo'].includes(sourceDescription.type)) {
      if (basePath.includes('$sourceDescriptions.')) {
        const [, sourceDescriptionName] = basePath.split('.');
        return sourceDescription.name === sourceDescriptionName;
      }
      return 'url' in sourceDescription && sourceDescription.url === basePath;
    }
    return false;
  })?.name;

  if (!descriptionName) {
    throw new Error(
      `Unknown operationPath ${red(operationPath)}. API description ${red(
        basePath,
      )} is not listed in 'sourceDescriptions' workflow section.`,
    );
  }

  const description = $sourceDescriptions[descriptionName] || {};
  const [prop, path, method] = JsonPointerLib.parse(fragmentIdentifier);

  if (prop !== 'paths') {
    throw new Error(
      `Invalid fragment identifier: ${fragmentIdentifier} at operationPath ${red(operationPath)}.`,
    );
  }

  const { servers } = description;
  const operation = JsonPointerLib.get(description, fragmentIdentifier) || ({} as OperationDetails);
  const pathItemObject =
    JsonPointerLib.get(description, JsonPointerLib.compile(['paths', path])) ||
    ({} as OperationDetails);

  // fixme: use servers from path level
  return {
    servers: pathItemObject.servers || servers, // use servers from path level if exists
    ...operation, // operation level servers override path level or global servers
    pathParameters: pathItemObject.parameters || [],
    path,
    method,
    descriptionName,
  };
}
