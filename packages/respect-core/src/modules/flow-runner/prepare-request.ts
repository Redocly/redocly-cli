import {
  getOperationFromDescriptionBySource,
  getRequestBodySchema,
  getRequestDataFromOpenApi,
} from '../description-parser/index.js';
import {
  parseRequestBody,
  resolveReusableComponentItem,
  isParameterWithIn,
  handlePayloadReplacements,
} from '../context-parser/index.js';
import { getServerUrl } from './get-server-url.js';
import { createRuntimeExpressionCtx, collectSecretFields } from './context/index.js';
import { evaluateRuntimeExpressionPayload } from '../runtime-expressions/index.js';
import { resolveXSecurityParameters } from './resolve-x-security-parameters.js';

import type { ExtendedSecurity } from '@redocly/openapi-core';
import type { Oas3SecurityScheme } from 'core/src/typings/openapi.js';
import type { ParameterWithIn } from '../context-parser/index.js';
import type { TestContext, Step, Parameter, PublicStep } from '../../types.js';
import type { OperationDetails } from '../description-parser/index.js';

export type RequestData = {
  serverUrl?: {
    url: string;
    // todo: support variables
  };
  path: string;
  method: string;
  parameters: ParameterWithIn[];
  requestBody: any;
  openapiOperation?: OperationDetails & { securitySchemes?: Record<string, Oas3SecurityScheme> };
};

export async function prepareRequest(
  ctx: TestContext,
  step: Step,
  workflowName: string
): Promise<RequestData> {
  const { stepId, operationId, operationPath, 'x-operation': xOperation } = step;

  const activeWorkflow = ctx.workflows.find((workflow) => workflow.workflowId === workflowName);
  const workflowLevelParameters = (activeWorkflow && activeWorkflow.parameters) || [];

  const openapiOperation = xOperation
    ? undefined
    : getOperationFromDescriptionBySource(
        {
          operationId,
          operationPath,
        },
        ctx
      );

  let path = '';
  let method;

  const serverUrl: { url: string; parameters?: ParameterWithIn[] } | undefined = getServerUrl({
    ctx,
    descriptionName: openapiOperation?.descriptionName,
    openapiOperation,
    xOperation,
  });

  if (xOperation) {
    method = xOperation.method;
  } else if (openapiOperation) {
    path = openapiOperation?.path;
    method = openapiOperation?.method;
  } else {
    // this should never happen, making typescript happy
    throw new Error('No operation found');
  }

  if (!serverUrl && !path.includes('http')) {
    throw new Error('No servers found in API description');
  }
  if (!method) {
    throw new Error('"method" is required to make a request');
  }

  const requestDataFromOpenAPI = openapiOperation && getRequestDataFromOpenApi(openapiOperation);

  const {
    payload: stepRequestBodyPayload,
    // encoding: stepRequestBodyEncoding,
    contentType: stepRequestBodyContentType,
    replacements,
  } = await parseRequestBody(step['requestBody'], ctx);

  const requestBody = stepRequestBodyPayload || requestDataFromOpenAPI?.requestBody;
  const contentType = stepRequestBodyContentType || requestDataFromOpenAPI?.contentType;
  const parameters = joinParameters(
    // order is important here, the last one wins
    typeof requestBody === 'object'
      ? [{ in: 'header', name: 'content-type', value: 'application/json' }]
      : [],
    serverUrl?.parameters || [],
    requestDataFromOpenAPI?.contentTypeParameters || [],
    // if step.parameters is defined, we do not auto-populate parameters from the openapi operation
    step.parameters ? [] : requestDataFromOpenAPI?.parameters || [],
    resolveParameters(workflowLevelParameters, ctx),
    stepRequestBodyContentType
      ? [{ in: 'header', name: 'content-type', value: stepRequestBodyContentType }]
      : [],
    resolveParameters(step.parameters || [], ctx)
  );

  // save local $steps context before evaluating runtime expressions
  if (!ctx.$steps[stepId]) {
    ctx.$steps[stepId] = {} as PublicStep;
  }
  // save local $workflows context
  if (!ctx.$workflows[workflowName].steps[stepId]) {
    ctx.$workflows[workflowName].steps[stepId] = {} as PublicStep;
  }
  // Supporting temporal extension of query method https://httpwg.org/http-extensions/draft-ietf-httpbis-safe-method-w-body.html
  if (method?.toLowerCase() === 'x-query') {
    method = 'query' as const;
  }

  ctx.$workflows[workflowName].steps[stepId].request = {
    body: requestBody,
    header: groupParametersValuesByName(parameters, 'header'),
    path: groupParametersValuesByName(parameters, 'path'),
    query: groupParametersValuesByName(parameters, 'query'),
    url: serverUrl?.url && path ? `${serverUrl?.url}${path}` : serverUrl?.url,
    method,
  };

  const ctxWithInputs = {
    ...ctx,
    $inputs: {
      ...(ctx.$inputs || {}),
      ...(ctx.$workflows[workflowName]?.inputs || {}),
    },
  };

  const expressionContext = createRuntimeExpressionCtx({
    ctx: ctxWithInputs,
    workflowId: workflowName,
    step,
  });

  const workflowLevelXSecurityParameters = activeWorkflow?.['x-security'] || [];

  const xSecurityParameters = resolveXSecurityParameters({
    ctx: ctxWithInputs,
    runtimeContext: expressionContext,
    step,
    operation: openapiOperation as OperationDetails & {
      securitySchemes: Record<string, Oas3SecurityScheme>;
    },
    workflowLevelXSecurityParameters: workflowLevelXSecurityParameters as ExtendedSecurity[],
  });

  const evaluatedParameters = joinParameters(parameters, xSecurityParameters).map((parameter) => {
    return {
      ...parameter,
      value: evaluateRuntimeExpressionPayload({
        payload: parameter.value,
        context: expressionContext,
        // contentType,
      }),
    };
  });

  for (const param of openapiOperation?.parameters || []) {
    const { schema, name } = param;
    collectSecretFields(ctx, schema, groupParametersValuesByName(parameters, param.in), [name]);
  }

  const evaluatedBody = evaluateRuntimeExpressionPayload({
    payload: requestBody,
    context: expressionContext,
    contentType,
  });

  if (replacements && typeof evaluatedBody === 'object') {
    handlePayloadReplacements(evaluatedBody, replacements, expressionContext);
  }

  if (contentType && openapiOperation?.requestBody) {
    const requestBodySchema = getRequestBodySchema(contentType, openapiOperation);
    if (typeof requestBody === 'object') {
      collectSecretFields(ctx, requestBodySchema, requestBody);
    }
  }

  // set evaluated values to the context
  ctx.$workflows[workflowName].steps[stepId].request = {
    body: evaluatedBody,
    header: groupParametersValuesByName(evaluatedParameters, 'header'),
    path: groupParametersValuesByName(evaluatedParameters, 'path'),
    query: groupParametersValuesByName(evaluatedParameters, 'query'),
    url: serverUrl?.url && path ? `${serverUrl?.url}${path}` : serverUrl?.url,
    method,
  };

  return {
    serverUrl,
    path,
    method,
    parameters: extractCookieParametersFromHeaderParameters(evaluatedParameters),
    requestBody: evaluatedBody,
    openapiOperation,
  };
}

function joinParameters(...parameters: ParameterWithIn[][]): ParameterWithIn[] {
  const parametersWithNames = parameters.flat().filter((param) => 'name' in param);

  const parameterMap = parametersWithNames.reduce((map, param) => {
    const key = `${param.name}:${param.in}`;
    map[key] = param;
    return map;
  }, {} as { [key: string]: ParameterWithIn });

  return Object.values(parameterMap);
}

function groupParametersValuesByName(
  parameters: ParameterWithIn[],
  inValue: 'header' | 'query' | 'path' | 'cookie'
): Record<string, string | number | boolean> {
  return parameters.reduce((acc, param) => {
    if (param.in === inValue && 'name' in param) {
      acc[param.in === 'header' ? param.name.toLowerCase() : param.name] = param.value;
    }
    return acc;
  }, {} as Record<string, string | number | boolean>);
}

function resolveParameters(parameters: Parameter[], ctx: TestContext): ParameterWithIn[] {
  return parameters
    .map((parameter) => {
      const resolvedParameter = resolveReusableComponentItem(parameter, ctx);
      if (!isParameterWithIn(resolvedParameter)) {
        return undefined;
      }
      return resolvedParameter;
    })
    .filter((parameter) => parameter !== undefined);
}

function extractCookieParametersFromHeaderParameters(
  parameters: ParameterWithIn[]
): ParameterWithIn[] {
  const result = [];
  for (const parameter of parameters) {
    if (parameter.in === 'header' && parameter.name.toLowerCase() === 'cookie') {
      const cookieParameters = String(parameter.value)
        .split(';')
        .map((cookie) => {
          const [key, value] = cookie.split('=');
          return { name: key, value, in: 'cookie' as const };
        });
      result.push(...cookieParameters);
    } else {
      result.push(parameter);
    }
  }

  return result;
}
