import { getValueFromContext } from '../config-parser';
import { formatCliInputs } from './inputs';

import type { ExtendedOperation, TestContext } from '../../types';
import type { OperationDetails } from '../description-parser';

export type GetServerUrlInput = {
  ctx: TestContext;
  descriptionName?: string;
  openapiOperation?: (OperationDetails & Record<string, any>) | undefined;
  xOperation?: ExtendedOperation;
};

export function getServerUrl({
  ctx,
  descriptionName,
  openapiOperation,
  xOperation,
}: GetServerUrlInput): { url: string } | undefined {
  if (!descriptionName && xOperation?.url) {
    return { url: xOperation?.url };
  }

  // Handle server overrides from command line `server` option
  if (ctx.options?.server && descriptionName) {
    const serverOverrides = formatCliInputs(ctx.options.server);
    if (serverOverrides[descriptionName]) {
      return { url: serverOverrides[descriptionName] };
    }
  }

  const sourceDescription = ctx.sourceDescriptions?.find((sd) => sd.name === descriptionName);

  if (
    sourceDescription &&
    sourceDescription.type === 'openapi' &&
    sourceDescription['x-serverUrl']
  ) {
    if (sourceDescription['x-serverUrl'].startsWith('http')) {
      return {
        url: sourceDescription['x-serverUrl'],
      };
    }

    return {
      url: getValueFromContext('$' + `sourceDescriptions.${descriptionName}.servers.0.url`, ctx),
    };
  }

  if (openapiOperation?.servers?.[0]) {
    const activeSourceDescription = ctx.sourceDescriptions?.find(
      (sd) => sd.name === openapiOperation.sourceDescriptionName
    );
    let serverUrlOverride;

    if (ctx.sourceDescriptions?.length === 1 && ctx.sourceDescriptions[0]) {
      serverUrlOverride =
        'x-serverUrl' in ctx.sourceDescriptions[0]
          ? ctx.sourceDescriptions[0]['x-serverUrl']
          : undefined;
    } else if (activeSourceDescription) {
      serverUrlOverride =
        'x-serverUrl' in activeSourceDescription
          ? activeSourceDescription['x-serverUrl']
          : undefined;
    }

    return serverUrlOverride ? { url: serverUrlOverride } : openapiOperation.servers[0];
  }

  if (!descriptionName && ctx?.sourceDescriptions && ctx.sourceDescriptions.length === 1) {
    const sourceDescription = ctx.sourceDescriptions[0];

    let serverUrl = '';
    if ('x-serverUrl' in sourceDescription && sourceDescription['x-serverUrl']) {
      serverUrl = sourceDescription['x-serverUrl'];
    } else {
      serverUrl = ctx.$sourceDescriptions[sourceDescription.name]?.servers[0]?.url || undefined;
    }

    return serverUrl ? { url: serverUrl } : undefined;
  }

  if (
    !descriptionName ||
    !ctx.$sourceDescriptions ||
    !ctx.$sourceDescriptions[descriptionName] ||
    !ctx.$sourceDescriptions[descriptionName].servers.length
  ) {
    return undefined;
  }

  // Get first available server url from the description
  return ctx.$sourceDescriptions[descriptionName].servers[0];
}
