import Ajv, { type JSONSchemaType, type Context as AjvContext } from '@redocly/ajv/dist/2020.js';
import { isPlainObject, toAjvSchema } from '@redocly/openapi-core';
import { blue, dim, red, green } from 'colorette';

import {
  type Check,
  type DescriptionChecks,
  type StepCallContext,
  type TestContext,
} from '../../../types.js';
import { printErrors as printAjvErrors } from '../../../utils/ajv-errors.js';
import { CHECKS } from '../../checks/index.js';
import {
  contentTypeMatchesPattern,
  getResponseKeyByStatusCode,
  getResponseSchema,
} from '../../description-parser/index.js';

const ajvOptions = {
  schemaId: '$id',
  meta: true,
  allErrors: true,
  strictSchema: false,
  inlineRefs: false,
  validateSchema: false,
  discriminator: true,
  allowUnionTypes: true,
  validateFormats: true,
  // Without it, `98.8` fails `multipleOf: 0.1` because of floating point division.
  multipleOfPrecision: 6,
  passContext: true,
  logger: false,
  verbose: true,
  defaultUnevaluatedProperties: false,
};
const ajvStrict = new (Ajv as any)(ajvOptions);
// Header values are strings, so they are coerced to the type in their schema, for example `10` to an integer.
const ajvHeaders = new (Ajv as any)({ ...ajvOptions, coerceTypes: 'array' });
// A header schema is compiled once per header name, since the name is part of the wrapper schema.
const headerValidators = new WeakMap<object, Map<string, { schema: object; validate: any }>>();

// Ajv keeps a compiled schema by the object it gets, so a schema is converted only once per target.
const ajvSchemas = {
  request: new WeakMap<object, unknown>(),
  response: new WeakMap<object, unknown>(),
  none: new WeakMap<object, unknown>(),
};

export function checkSchema({
  stepCallCtx,
  descriptionOperation,
  ctx,
  ajvContext,
}: {
  stepCallCtx: StepCallContext;
  descriptionOperation?: any;
  ctx: TestContext;
  ajvContext?: AjvContext;
}): Check[] {
  const { $response } = stepCallCtx;

  const checks: Check[] = [];

  // if no $response, that is a common case for executing dependsOn workflow steps of workflow inside
  // the step - return checks
  if (!$response || !descriptionOperation) {
    return checks;
  }

  checkStatusCodeFromDescription({ checks, descriptionOperation, $response, ctx });

  checkContentTypeFromDescription({ checks, descriptionOperation, $response, ctx });

  checkResponseHeadersFromDescription({ checks, descriptionOperation, $response, ctx });

  checkSchemaFromDescription({ checks, descriptionOperation, $response, ctx, ajvContext });

  return checks;
}

function checkSchemaFromDescription({
  checks,
  descriptionOperation,
  $response,
  ctx,
  ajvContext,
}: DescriptionChecks & { ctx: TestContext; ajvContext?: AjvContext }): void {
  const { body: resultBody } = $response;
  const schemaFromDescription = $response?.contentType
    ? getResponseSchema({
        statusCode: $response.statusCode,
        contentType: $response.contentType,
        descriptionResponses: descriptionOperation?.responses,
      })
    : undefined;

  if (schemaFromDescription) {
    try {
      const target = ajvContext?.apiContext;
      const convertedSchemas = ajvSchemas[target ?? 'none'];
      // A boolean schema has nothing to convert.
      if (isPlainObject(schemaFromDescription) && !convertedSchemas.has(schemaFromDescription)) {
        convertedSchemas.set(schemaFromDescription, toAjvSchema(schemaFromDescription, { target }));
      }
      const schema = convertedSchemas.get(schemaFromDescription) ?? schemaFromDescription;
      const validate = ajvStrict.compile(schema as JSONSchemaType<unknown>);
      checks.push({
        name: CHECKS.SCHEMA_CHECK,
        passed: validate.call(ajvContext, resultBody),
        message: validate.errors
          ? printAjvErrors(schema as JSONSchemaType<unknown>, resultBody, validate.errors)
          : '',
        severity: ctx.severity['SCHEMA_CHECK'],
      });
    } catch (error: any) {
      checks.push({
        name: CHECKS.SCHEMA_CHECK,
        passed: false,
        message: `Ajv error: ${error.message as string}`,
        severity: ctx.severity['SCHEMA_CHECK'],
      });
    }
  }
}

function checkStatusCodeFromDescription({
  checks,
  descriptionOperation,
  $response,
  ctx,
}: DescriptionChecks & { ctx: TestContext }): void {
  const responseStatusCode = $response?.statusCode;
  const descriptionResponses = descriptionOperation?.responses || {};
  const responseCodesFromDescription = Object.keys(descriptionResponses);
  const matchedResponseKey = getResponseKeyByStatusCode(descriptionResponses, responseStatusCode);

  const message =
    matchedResponseKey === String(responseStatusCode)
      ? dim(`List of valid response codes are inferred from description \n\n`) +
        statusCodeDiff(`${responseStatusCode}`, responseCodesFromDescription.map(String))
      : ''; // NOTE: we don't show any diff if response code hits a range or the default response

  const passed = matchedResponseKey !== undefined;

  checks.push({
    name: CHECKS.STATUS_CODE_CHECK,
    passed,
    message,
    ...(passed && {
      condition: `$statusCode in [${responseCodesFromDescription.join(', ')}]`,
    }),
    severity: ctx.severity['STATUS_CODE_CHECK'],
  });
}

function checkContentTypeFromDescription({
  checks,
  descriptionOperation,
  $response,
  ctx,
}: DescriptionChecks & { ctx: TestContext }): void {
  const statusCode = $response?.statusCode;
  const responseContentType = $response?.contentType;
  const descriptionResponses = descriptionOperation?.responses || {};
  const responseKey = getResponseKeyByStatusCode(descriptionResponses, statusCode);
  const possibleContentTypesFromDescription = Object.keys(
    (responseKey && descriptionResponses[responseKey]?.content) || {}
  );

  if (!possibleContentTypesFromDescription.length) {
    return;
  }

  if (
    responseContentType &&
    !possibleContentTypesFromDescription.some((pattern) =>
      contentTypeMatchesPattern(responseContentType, pattern)
    )
  ) {
    checks.push({
      name: CHECKS.CONTENT_TYPE_CHECK,
      passed: false,
      message: `Content type ${red(responseContentType)} for ${blue(
        statusCode
      )} response is not described in the schema.
       Expected content types: ${blue(possibleContentTypesFromDescription.join(', '))}.`,
      severity: ctx.severity['CONTENT_TYPE_CHECK'],
    });
  } else {
    checks.push({
      name: CHECKS.CONTENT_TYPE_CHECK,
      passed: true,
      message: `Content type "${responseContentType}" is described in the schema.`,
      severity: ctx.severity['CONTENT_TYPE_CHECK'],
    });
  }
}

function checkResponseHeadersFromDescription({
  checks,
  descriptionOperation,
  $response,
  ctx,
}: DescriptionChecks & { ctx: TestContext }): void {
  const descriptionResponses = descriptionOperation?.responses || {};
  const responseKey = getResponseKeyByStatusCode(descriptionResponses, $response.statusCode);
  // the description is bundled with `dereference: true`, so header objects have no `$ref`
  const describedHeaders = Object.entries(
    ((responseKey && descriptionResponses[responseKey]?.headers) || {}) as Record<
      string,
      { required?: boolean; schema?: unknown }
    >
    // OpenAPI ignores a `Content-Type` entry in the response headers
  ).filter(([name]) => name.toLowerCase() !== 'content-type');

  // header names are case-insensitive, extra headers are fine
  const receivedHeaders = new Map(
    Object.entries($response.header || {}).map(([name, value]) => [name.toLowerCase(), value])
  );
  const missingHeaders: string[] = [];
  const headerErrors: string[] = [];

  for (const [name, header] of describedHeaders) {
    const value = receivedHeaders.get(name.toLowerCase());
    if (value === undefined) {
      if (header?.required) missingHeaders.push(name);
      continue;
    }
    if (!isPlainObject(header?.schema)) {
      continue;
    }
    try {
      const validators = headerValidators.get(header.schema) ?? new Map();
      headerValidators.set(header.schema, validators);
      let validator = validators.get(name);
      if (!validator) {
        const schema = {
          type: 'object',
          properties: { [name]: toAjvSchema(header.schema, { target: 'response' }) },
        };
        validator = { schema, validate: ajvHeaders.compile(schema) };
        validators.set(name, validator);
      }
      // Ajv coerces only values inside an object, so the header value is wrapped in one.
      const data = { [name]: value };
      if (!validator.validate(data)) {
        headerErrors.push(
          printAjvErrors(
            validator.schema as JSONSchemaType<unknown>,
            data,
            validator.validate.errors
          )
        );
      }
    } catch (error: any) {
      headerErrors.push(`Ajv error for the ${name} header: ${error.message as string}`);
    }
  }

  const checkedHeaders = describedHeaders.filter(
    ([name, header]) => header?.required || receivedHeaders.has(name.toLowerCase())
  );
  if (!checkedHeaders.length) {
    return;
  }

  const problems = [
    ...(missingHeaders.length
      ? [
          `Required headers for ${blue($response.statusCode)} response are missing: ${red(
            missingHeaders.join(', ')
          )}.`,
        ]
      : []),
    ...headerErrors,
  ];

  checks.push({
    name: CHECKS.RESPONSE_HEADER_CHECK,
    passed: problems.length === 0,
    message: problems.length
      ? problems.join('\n')
      : `Response headers match the description: ${checkedHeaders.map(([name]) => name).join(', ')}.`,
    severity: ctx.severity['RESPONSE_HEADER_CHECK'],
  });
}

export function statusCodeDiff<E = unknown>(actual: unknown, expected: E[]) {
  const pass = expected.includes(actual as E);
  const expectedText = expected.join(', ');
  const receivedText = String(actual);

  return `Expected value to be in the list:\n  ${expectedText}\nReceived:\n  ${
    pass ? green(receivedText) : red(receivedText)
  }`;
}
