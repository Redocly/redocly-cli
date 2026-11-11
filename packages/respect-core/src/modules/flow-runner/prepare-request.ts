import {
  isPlainObject,
  type ExtendedSecurity,
  type Oas3MediaType,
  type Oas3Parameter,
  type Oas3SecurityScheme,
} from '@redocly/openapi-core';

import {
  type TestContext,
  type Step,
  type Parameter,
  type PublicStep,
  type OperationMethod,
} from '../../types.js';
import { isJSON } from '../../utils/is-json.js';
import { isFormUrlencoded } from '../../utils/url-encoding.js';
import {
  parseRequestBody,
  resolveReusableComponentItem,
  isParameterWithIn,
  handlePayloadReplacements,
  type ParameterWithIn,
} from '../context-parser/index.js';
import {
  getOperationFromDescriptionBySource,
  getRequestBodySchema,
  getRequestDataFromOpenApi,
  type OperationDetails,
} from '../description-parser/index.js';
import { evaluateRuntimeExpressionPayload } from '../runtime-expressions/index.js';
import { createRuntimeExpressionCtx, collectSecretValues } from './context/index.js';
import { getServerUrl } from './get-server-url.js';
import { resolveXSecurityParameters } from './resolve-x-security-parameters.js';

export type RequestData = {
  serverUrl?: {
    url: string;
    // todo: support variables
  };
  path: string;
  method: OperationMethod;
  parameters: ParameterWithIn[];
  // the media type the API description gives to the `querystring` parameter of the operation
  querystringMediaType?: string;
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

  const requestDataFromOpenAPI =
    openapiOperation && getRequestDataFromOpenApi(openapiOperation, ctx.options.logger);

  const {
    payload: stepRequestBodyPayload,
    // encoding: stepRequestBodyEncoding,
    contentType: stepRequestBodyContentType,
    replacements,
  } = await parseRequestBody(step['requestBody'], ctx);

  const requestBody =
    stepRequestBodyPayload !== undefined
      ? stepRequestBodyPayload
      : requestDataFromOpenAPI?.requestBody;
  const contentType = stepRequestBodyContentType || requestDataFromOpenAPI?.contentType;
  // if step.parameters is defined, we do not auto-populate parameters from the openapi operation
  const generatedParameters = step.parameters ? [] : requestDataFromOpenAPI?.parameters || [];
  const parameters = joinParameters(
    // order is important here, the last one wins
    isPlainObject(requestBody) || Array.isArray(requestBody)
      ? [{ in: 'header', name: 'content-type', value: 'application/json' }]
      : [],
    serverUrl?.parameters || [],
    requestDataFromOpenAPI?.contentTypeParameters || [],
    generatedParameters,
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
      ...ctx.$inputs,
      ...ctx.$workflows[workflowName]?.inputs,
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

  const evaluatedParameters = dropGeneratedQueryConflicts(
    joinParameters(parameters, xSecurityParameters),
    generatedParameters
  ).map((parameter) => {
    return {
      ...parameter,
      value: evaluateRuntimeExpressionPayload({
        payload: parameter.value,
        context: expressionContext,
        logger: ctx.options.logger,
      }),
    };
  });

  validateQuerystringParameter(evaluatedParameters, stepId);

  const describedParameters: Oas3Parameter[] = [
    ...(openapiOperation?.parameters || []),
    ...(openapiOperation?.pathParameters || []),
  ];
  const [querystringMediaType, querystringMediaTypeObject] =
    Object.entries(
      describedParameters.find((parameter) => parameter.in === 'querystring')?.content || {}
    )[0] || [];
  collectQuerystringSecrets(
    ctx,
    evaluatedParameters,
    querystringMediaType,
    querystringMediaTypeObject
  );

  for (const param of openapiOperation?.parameters || []) {
    const { schema, name } = param;
    collectSecretValues(ctx, schema, groupParametersValuesByName(parameters, param.in), [name]);
  }

  const evaluatedBody = evaluateRuntimeExpressionPayload({
    payload: requestBody,
    context: expressionContext,
    contentType,
    logger: ctx.options.logger,
  });

  if (replacements && (isPlainObject(evaluatedBody) || Array.isArray(evaluatedBody))) {
    handlePayloadReplacements({
      payload: evaluatedBody,
      replacements,
      expressionContext,
      logger: ctx.options.logger,
    });
  }

  if (contentType && openapiOperation?.requestBody) {
    const requestBodySchema = getRequestBodySchema(contentType, openapiOperation);
    if (isPlainObject(requestBody) || Array.isArray(requestBody)) {
      collectSecretValues(ctx, requestBodySchema, requestBody);
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
    querystringMediaType,
    requestBody: evaluatedBody,
    openapiOperation,
  };
}

function joinParameters(...parameters: ParameterWithIn[][]): ParameterWithIn[] {
  const parametersWithNames = parameters.flat().filter((param) => 'name' in param);

  const parameterMap = parametersWithNames.reduce(
    (map, param) => {
      const key = `${param.name}:${param.in}`;
      map[key] = param;
      return map;
    },
    {} as { [key: string]: ParameterWithIn }
  );

  return Object.values(parameterMap);
}

// A query string and query parameters cannot be sent together, so the parameters generated
// from the API description give way to the ones the Arazzo description sets.
function dropGeneratedQueryConflicts(
  parameters: ParameterWithIn[],
  generatedParameters: ParameterWithIn[]
): ParameterWithIn[] {
  const explicitLocations = new Set(
    parameters
      .filter((parameter) => !generatedParameters.includes(parameter))
      .map((parameter) => parameter.in)
  );

  return parameters.filter(
    (parameter) =>
      !generatedParameters.includes(parameter) ||
      !(
        (parameter.in === 'querystring' && explicitLocations.has('query')) ||
        (parameter.in === 'query' && explicitLocations.has('querystring'))
      )
  );
}

// Password fields of a described query string are secrets, the same as password query parameters.
function collectQuerystringSecrets(
  ctx: TestContext,
  parameters: ParameterWithIn[],
  mediaType?: string,
  mediaTypeObject?: Oas3MediaType
) {
  const querystring = parameters.find((parameter) => parameter.in === 'querystring')?.value;

  if (typeof querystring !== 'string' || !mediaType) {
    return;
  }
  if (isFormUrlencoded(mediaType)) {
    collectSecretValues(
      ctx,
      mediaTypeObject?.schema,
      Object.fromEntries(new URLSearchParams(querystring))
    );
  } else if (isJSON(querystring)) {
    collectSecretValues(ctx, mediaTypeObject?.schema, JSON.parse(querystring));
  }
}

// A querystring parameter is the whole query string, so a request takes only one and no query parameters.
function validateQuerystringParameter(parameters: ParameterWithIn[], stepId: string) {
  const querystringParameters = parameters.filter((parameter) => parameter.in === 'querystring');
  const [querystringParameter] = querystringParameters;

  if (!querystringParameter) {
    return;
  }
  if (querystringParameters.length > 1) {
    throw new Error(
      `A request accepts only one "querystring" parameter, but step ${stepId} has ${querystringParameters.length}: ${querystringParameters
        .map((parameter) => parameter.name)
        .join(', ')}.`
    );
  }
  if (parameters.some((parameter) => parameter.in === 'query')) {
    throw new Error(
      `The "querystring" parameter ${querystringParameter.name} of step ${stepId} cannot be combined with "query" parameters, because it sets the whole query string.`
    );
  }
  if (typeof querystringParameter.value !== 'string') {
    throw new Error(
      `The value of the "querystring" parameter ${querystringParameter.name} of step ${stepId} must be a string with the whole query string.`
    );
  }
}

function groupParametersValuesByName(
  parameters: ParameterWithIn[],
  inValue: 'header' | 'query' | 'path' | 'cookie'
): Record<string, string | number | boolean> {
  return parameters.reduce(
    (acc, param) => {
      if (param.in === inValue && 'name' in param) {
        acc[param.in === 'header' ? param.name.toLowerCase() : param.name] = param.value;
      }
      return acc;
    },
    {} as Record<string, string | number | boolean>
  );
}

function resolveParameters(parameters: Parameter[], ctx: TestContext): ParameterWithIn[] {
  return parameters
    .map((parameter) => {
      const xAllowReserved = (parameter as Record<string, unknown>)['x-allowReserved'];
      const resolvedParameter = resolveReusableComponentItem(parameter, ctx);
      if (!isParameterWithIn(resolvedParameter)) {
        return undefined;
      }
      if (typeof xAllowReserved === 'boolean') {
        return { ...resolvedParameter, allowReserved: xAllowReserved };
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
