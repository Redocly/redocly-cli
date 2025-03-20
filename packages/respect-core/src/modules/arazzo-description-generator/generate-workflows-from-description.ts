import { sortMethods } from '../../utils/sort';
import { generateWorkflowSecurityInputs } from './generate-workflow-security-inputs';
import { generateWorkflowSecurityParameters } from './generate-workflow-security-parameters';
import {
  type Oas3SecurityScheme,
  type Oas3SecurityRequirement,
  type Oas3PathItem,
  type Oas3_1Schema,
  type Oas3Operation,
} from 'core/src/typings/openapi';
import { type OperationMethod, type Workflow, type Step } from '../../types';
import {
  type ArazzoDefinition,
  type ExtendedOperation,
} from '@redocly/openapi-core/lib/typings/arazzo.js';

type HttpMethod = Lowercase<ExtendedOperation['method']>;

export type WorkflowsFromDescriptionInput = {
  descriptionPaths: {
    [name: string]: Oas3PathItem<Oas3_1Schema> & {
      connect?: Oas3Operation<Oas3_1Schema>;
      query?: Oas3Operation<Oas3_1Schema>;
    };
  };
  sourceDescriptionName: string;
  rootSecurity: Oas3SecurityRequirement[];
  inputsComponents: NonNullable<ArazzoDefinition['components']>;
  securitySchemes: Record<string, Oas3SecurityScheme>;
};

export function generateWorkflowsFromDescription({
  descriptionPaths,
  sourceDescriptionName,
  rootSecurity,
  inputsComponents,
  securitySchemes,
}: WorkflowsFromDescriptionInput): Workflow[] {
  const workflows = [] as Workflow[];

  for (const pathItemKey in descriptionPaths) {
    for (const pathItemObjectKey of Object.keys(descriptionPaths[pathItemKey]).sort(sortMethods)) {
      const methodToCheck = pathItemObjectKey.toLocaleLowerCase() as HttpMethod;

      if (
        [
          'get',
          'post',
          'put',
          'delete',
          'patch',
          'head',
          'options',
          'trace',
          'connect',
          'query',
        ].includes(methodToCheck.toLocaleLowerCase())
      ) {
        const method = methodToCheck as OperationMethod;
        const pathKey = pathItemKey
          .replace(/^\/|\/$/g, '')
          .split('/')
          .join('-');

        const operation = descriptionPaths[pathItemKey][methodToCheck.toLowerCase() as HttpMethod];
        const operationSecurity = operation?.security || undefined;
        const operationId = generateOperationId(sourceDescriptionName, operation?.operationId);
        const operationPath = !operationId
          ? generateOperationPath(sourceDescriptionName, pathItemKey, method)
          : undefined;
        const workflowSecurityInputs = generateWorkflowSecurityInputs(
          inputsComponents,
          operationSecurity || rootSecurity || []
        );
        const workflowSecurityParameters = generateWorkflowSecurityParameters(
          inputsComponents,
          operationSecurity || rootSecurity || [],
          securitySchemes
        );

        workflows.push({
          workflowId: pathKey ? `${method}-${pathKey}-workflow` : `${method}-workflow`,
          ...(workflowSecurityInputs && { inputs: workflowSecurityInputs }),
          ...(workflowSecurityParameters.length && {
            parameters: workflowSecurityParameters,
          }),
          steps: [
            {
              stepId: pathKey ? `${method}-${pathKey}-step` : `${method}-step`,
              ...(operationId ? { operationId } : { operationPath }),
              ...generateParametersWithSuccessCriteria(
                descriptionPaths[pathItemKey][methodToCheck.toLowerCase() as HttpMethod]?.responses
              ),
            } as Step,
          ],
        } as Workflow);
      }
    }
  }

  return workflows;
}

function generateParametersWithSuccessCriteria(
  responses: any
): [] | { successCriteria: { condition: string }[] } {
  const responseCodesFromDescription = Object.keys(responses || {});

  if (!responseCodesFromDescription.length) {
    return [];
  }

  const firstResponseCode = responseCodesFromDescription?.[0];
  return { successCriteria: [{ condition: `$statusCode == ${firstResponseCode}` }] };
}

function generateOperationId(sourceDescriptionName: string, operationId?: string) {
  if (!operationId) {
    return undefined;
  }

  return `$sourceDescriptions.${sourceDescriptionName}.${operationId}`;
}

function generateOperationPath(
  sourceDescriptionName: string,
  path: string,
  method: OperationMethod
) {
  return `{$sourceDescriptions.${sourceDescriptionName}.url}#/paths/~1${path.replace(
    /^\//,
    ''
  )}/${method}`;
}
