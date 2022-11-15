import { Oas3Decorator } from '../../visitors';
import { Oas3Operation, Oas3RequestBody } from '../../typings/openapi';
import { readAndParseFileSync } from '../../utils';

export const MediaTypeExamplesOverride: Oas3Decorator = ({ operationIds }) => {
  return {
    Operation: {
      leave(operation: Oas3Operation) {
        const operationId = operation.operationId;

        if (!operationId) {
          return;
        }

        const properties = operationIds[operationId];

        if (properties.responses && operation.responses) {
          for (const responseCode of Object.keys(properties.responses)) {
            if (!operation.responses[responseCode] || !operation.responses[responseCode]?.content) {
              continue;
            }

            Object.values(operation.responses[responseCode].content!).forEach((mimeType) => {
              const exampleField = mimeType.examples ? 'examples' : 'example';
              mimeType[exampleField] = readAndParseFileSync(properties.responses[responseCode]);
            });
          }
        }

        if (properties.request && operation.requestBody) {
          Object.keys(properties.request).forEach((mimeType) => {
            (operation.requestBody as Oas3RequestBody).content[mimeType].example =
              readAndParseFileSync(properties.request[mimeType]);
          });
        }
      },
    },
  };
};
