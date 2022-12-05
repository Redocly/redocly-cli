import { Oas3Decorator } from '../../visitors';
import { Oas3Operation, Oas3RequestBody, Oas3Response } from '../../typings/openapi';
import { readAndParseFileSync } from '../../utils';
import { isRef } from '../../ref-utils';
import { ResolveFn, UserContext } from '../../walk';

export const MediaTypeExamplesOverride: Oas3Decorator = ({ operationIds }) => {
  function checkAndResolveRef<T>(node: any, resolver: ResolveFn): T | undefined {
    if (!isRef(node)) {
      return node;
    }

    const resolved = resolver<T>(node);
    return resolved.error ? undefined : JSON.parse(JSON.stringify(resolved.node));
  }

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

            if (!resolvedResponse || !resolvedResponse?.content) {
              continue;
            }

            Object.values(resolvedResponse.content!).forEach((mimeType) => {
              const exampleField = mimeType.examples ? 'examples' : 'example';
              mimeType[exampleField] = readAndParseFileSync(properties.responses[responseCode]);
            });

            operation.responses[responseCode] = resolvedResponse;
          }
        }

        if (properties.request && operation.requestBody) {
          const resolvedRequest = checkAndResolveRef<Oas3RequestBody>(
            operation.requestBody,
            ctx.resolve
          );

          if (!resolvedRequest || !resolvedRequest?.content) {
            return;
          }

          Object.keys(properties.request).forEach((mimeType) => {
            resolvedRequest.content[mimeType].example = readAndParseFileSync(
              properties.request[mimeType]
            );
          });
          operation.requestBody = resolvedRequest;
        }
      },
    },
  };
};
