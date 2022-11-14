import { Oas3Decorator } from '../../visitors';
import { Oas3Operation, Oas3RequestBody } from '../../typings/openapi';
import { readAndParseFileSync } from '../../utils';

export const MediaTypeExamplesOverride: Oas3Decorator = ({ operationIds }) => {
  let operationId: string | undefined;
  return {
    Operation: {
      leave(operation: Oas3Operation) {
        operationId = operation.operationId;
        const properties = operationIds[operationId!];

        if (properties.responses && operation.responses) {
          for (const responseCode of Object.keys(properties.responses)) {
            if (!operation.responses[responseCode] || !operation.responses[responseCode]?.content) {
              continue;
            }

            Object.values(operation.responses[responseCode].content!).forEach((mimeType) => {
              if (mimeType.examples) {
                mimeType.examples = readAndParseFileSync(properties.responses[responseCode]);
              } else {
                mimeType.example = readAndParseFileSync(properties.responses[responseCode]);
              }
            });
          }
        }

        if (!properties.request || !operation.requestBody) {
          return;
        }

        for (const mimeType of Object.keys(properties.request)) {
          (operation.requestBody as Oas3RequestBody).content[mimeType] = readAndParseFileSync(
            properties.request[mimeType]
          );
        }
      },
    },
  };
};
