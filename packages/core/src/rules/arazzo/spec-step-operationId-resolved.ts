import type { Arazzo1Rule } from '../../visitors.js';

export const SPEC_STEP_OPERATION_ID_RESOLVED_RULE_ID = 'spec-step-operationId-resolved';

// `lintDocument` loads the OpenAPI source descriptions and stores their operation ids by `url`
export type SpecStepOperationIdResolvedData = {
  operationIdsBySourceUrl?: Map<string, Set<string>>;
};

export const SpecStepOperationIdResolved: Arazzo1Rule = () => {
  // `undefined` marks a source description whose operations cannot be read
  const operationIdsBySourceName = new Map<string, Set<string> | undefined>();

  return {
    SourceDescriptions(sourceDescriptions, { getVisitorData }) {
      // the visitor data is an untyped store, so its shape is asserted here
      const { operationIdsBySourceUrl } = getVisitorData() as SpecStepOperationIdResolvedData;

      for (const sourceDescription of sourceDescriptions) {
        if (typeof sourceDescription?.name !== 'string') continue;

        if (sourceDescription.type === 'openapi') {
          operationIdsBySourceName.set(
            sourceDescription.name,
            operationIdsBySourceUrl?.get(sourceDescription.url)
          );
        } else if (sourceDescription.type === 'arazzo') {
          operationIdsBySourceName.set(sourceDescription.name, new Set());
        } else {
          operationIdsBySourceName.set(sourceDescription.name, undefined);
        }
      }
    },
    Step(step, { report, location }) {
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

      const sourceNamesWithOperation = [...operationIdsBySourceName.keys()].filter((sourceName) =>
        operationIdsBySourceName.get(sourceName)?.has(stepOperationId)
      );
      if (sourceNamesWithOperation.length > 1) {
        reportUnresolved(
          `The operation \`${stepOperationId}\` is defined in several source descriptions: ${sourceNamesWithOperation.join(', ')}. Use \`$sourceDescriptions.<name>.${stepOperationId}\` to pick one.`
        );
        return;
      }

      const isDefinedOrCannotBeChecked =
        sourceNamesWithOperation.length === 1 ||
        [...operationIdsBySourceName.values()].some((operationIds) => !operationIds);
      if (isDefinedOrCannotBeChecked) return;

      // Respect also accepts the short form <sourceDescriptionName>.<operationId>
      const [sourceName, ...operationIdParts] = stepOperationId.split('.');
      if (operationIdsBySourceName.get(sourceName)?.has(operationIdParts.join('.'))) return;

      reportUnresolved(
        `The operation \`${stepOperationId}\` is not defined in any of the source descriptions.`
      );
    },
  };
};
