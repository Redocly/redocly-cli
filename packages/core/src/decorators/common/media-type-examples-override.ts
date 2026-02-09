import { isRef } from '../../ref-utils.js';
import { resolveRelativePath, yamlAndJsonSyncReader } from '../../utils/yaml-fs-helper.js';
import type { Oas3Operation, Oas3RequestBody, Oas3Response } from '../../typings/openapi.js';
import type { Oas3Decorator } from '../../visitors.js';
import type { NonUndefined, ResolveFn, UserContext } from '../../walk.js';

export const MediaTypeExamplesOverride: Oas3Decorator = ({ operationIds }) => {
  return {
    Operation: {
      enter(operation: Oas3Operation, ctx: UserContext) {
        const operationId = operation.operationId;

        if (!operationId) {
          return;
        }

        const properties = operationIds[operationId];

        if (!properties) {
          return;
        }

        if (properties.responses && operation.responses) {
          for (const responseCode of Object.keys(properties.responses)) {
            const resolvedResponse = checkAndResolveRef<Oas3Response>(
              operation.responses[responseCode],
              ctx.resolve
            );

            if (!resolvedResponse) {
              continue;
            }

            resolvedResponse.content = resolvedResponse.content ? resolvedResponse.content : {};

            Object.keys(properties.responses[responseCode]).forEach((mimeType) => {
              const filePath = properties.responses[responseCode][mimeType];
              resolvedResponse.content![mimeType] = {
                ...resolvedResponse.content![mimeType],
                examples: yamlAndJsonSyncReader(
                  resolveRelativePath(filePath, ctx.config?.configPath)
                ),
              };
            });

            operation.responses[responseCode] = resolvedResponse;
          }
        }

        if (properties.request && operation.requestBody) {
          const resolvedRequest = checkAndResolveRef<Oas3RequestBody>(
            operation.requestBody,
            ctx.resolve
          );

          if (!resolvedRequest) {
            return;
          }

          resolvedRequest.content = resolvedRequest.content ? resolvedRequest.content : {};

          Object.keys(properties.request).forEach((mimeType) => {
            const filePath = properties.request[mimeType];
            resolvedRequest.content[mimeType] = {
              ...resolvedRequest.content[mimeType],
              examples: yamlAndJsonSyncReader(
                resolveRelativePath(filePath, ctx.config?.configPath)
              ),
            };
          });
          operation.requestBody = resolvedRequest;
        }
      },
    },
  };
};

function checkAndResolveRef<T extends NonUndefined>(node: any, resolver: ResolveFn): T | undefined {
  if (!isRef(node)) {
    return node;
  }

  const resolved = resolver<T>(node);
  return resolved.error ? undefined : JSON.parse(JSON.stringify(resolved.node));
}
