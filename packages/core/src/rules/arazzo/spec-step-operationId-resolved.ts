import { isRef } from '../../ref-utils.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { NonUndefined, ResolveFn, UserContext } from '../../walk.js';

export const SpecStepOperationIdResolved: Arazzo1Rule = () => {
  // `undefined` marks a source description whose operations cannot be read
  const operationIdsBySourceName = new Map<string, Set<string> | undefined>();

  return {
    SourceDescriptions: {
      enter(sourceDescriptions, { resolve }: UserContext) {
        for (const sourceDescription of sourceDescriptions) {
          if (sourceDescription.type === 'openapi') {
            operationIdsBySourceName.set(
              sourceDescription.name,
              collectOperationIds(sourceDescription.url, resolve)
            );
          } else if (sourceDescription.type === 'arazzo') {
            operationIdsBySourceName.set(sourceDescription.name, new Set());
          } else {
            operationIdsBySourceName.set(sourceDescription.name, undefined);
          }
        }
      },
    },
    Step: {
      enter(step, { report, location }: UserContext) {
        const stepOperationId = step.operationId;
        if (typeof stepOperationId !== 'string') return;

        const reportUnresolved = (message: string) =>
          report({
            message,
            location: location.child(['operationId']),
            reference: 'https://redocly.com/docs/cli/rules/arazzo/spec-step-operationid-resolved',
          });

        if (stepOperationId.startsWith('$sourceDescriptions.')) {
          const [, sourceName, ...operationIdParts] = stepOperationId.split('.');
          const operationId = operationIdParts.join('.');
          const operationIds = operationIdsBySourceName.get(sourceName);

          if (!operationIdsBySourceName.has(sourceName)) {
            reportUnresolved(
              `The source description \`${sourceName}\` is not defined in \`sourceDescriptions\`.`
            );
          } else if (operationIds && !operationIds.has(operationId)) {
            reportUnresolved(
              `The operation \`${operationId}\` is not defined in the source description \`${sourceName}\`.`
            );
          }
          return;
        }

        const isDefinedOrCannotBeChecked = [...operationIdsBySourceName.values()].some(
          (operationIds) => !operationIds || operationIds.has(stepOperationId)
        );
        if (isDefinedOrCannotBeChecked) return;

        // Respect also accepts the short form <sourceDescriptionName>.<operationId>
        const [sourceName, ...operationIdParts] = stepOperationId.split('.');
        if (operationIdsBySourceName.get(sourceName)?.has(operationIdParts.join('.'))) return;

        reportUnresolved(
          `The operation \`${stepOperationId}\` is not defined in any of the source descriptions.`
        );
      },
    },
  };
};

function collectOperationIds(sourceDescriptionUrl: string, resolve: ResolveFn) {
  const { node: description, location } = resolve<NonUndefined>({ $ref: sourceDescriptionUrl });
  if (!location || !isPlainObject(description)) return undefined;

  const operationIds = new Set<string>();
  const paths = isPlainObject(description.paths) ? description.paths : {};

  for (const pathItemOrRef of Object.values(paths)) {
    const pathItem = isRef(pathItemOrRef)
      ? resolve<NonUndefined>(pathItemOrRef, location.source.absoluteRef).node
      : pathItemOrRef;
    if (!isPlainObject(pathItem)) continue;

    // `additionalOperations` holds the operations with a custom HTTP method in OpenAPI 3.2
    const additionalOperations = isPlainObject(pathItem.additionalOperations)
      ? pathItem.additionalOperations
      : {};

    for (const operation of [...Object.values(pathItem), ...Object.values(additionalOperations)]) {
      if (isPlainObject(operation) && typeof operation.operationId === 'string') {
        operationIds.add(operation.operationId);
      }
    }
  }

  return operationIds;
}
