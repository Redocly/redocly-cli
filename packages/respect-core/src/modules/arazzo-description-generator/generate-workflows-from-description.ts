import { sortMethods } from '../../utils/sort';
import { generateWorkflowSecurityInputs } from './generate-workflow-security-inputs';
import { type OperationMethod, type Workflow, type Step } from '../../types';
import { generateWorkflowSecurityParameters } from './generate-workflow-security-parameters';

export type WorkflowsFromDescriptionInput = {
  descriptionPaths: any;
  sourceDescriptionName: string;
  rootSecurity: any;
  inputsComponents: any;
  securitySchemes: any;
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
      const methodToCheck = pathItemObjectKey.toLocaleLowerCase();

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

        const operation = descriptionPaths[pathItemKey][method];
        const operationSecurity = operation?.security || undefined;
        const operationId = operation?.operationId || generateOperationId(pathItemKey, method);
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
              operationId: `$sourceDescriptions.${sourceDescriptionName}.${operationId}`,
              ...generateParametersWithSuccessCriteria(
                descriptionPaths[pathItemKey][method].responses
              ),
            } as unknown as Step,
          ],
        } as unknown as Workflow);
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

function generateOperationId(path: string, method: OperationMethod) {
  return `${method}@${path}`;
}
