import Ajv, { type JSONSchemaType, type Context as AjvContext } from '@redocly/ajv/dist/2020.js';
import { isPlainObject, type Oas3Responses } from '@redocly/openapi-core';
import { blue, dim, red, yellow, green } from 'colorette';

import {
  type Check,
  type DescriptionChecks,
  type StepCallContext,
  type TestContext,
} from '../../../types.js';
import { printErrors as printAjvErrors } from '../../../utils/ajv-errors.js';
import { checkCircularRefsInSchema } from '../../../utils/check-circular-refs-in-schema.js';
import { CHECKS } from '../../checks/index.js';

const ajvBaseOptions = {
  schemaId: '$id',
  meta: true,
  allErrors: true,
  strictSchema: false,
  inlineRefs: false,
  validateSchema: false,
  allowUnionTypes: true,
  validateFormats: true,
  passContext: true,
  logger: false,
  verbose: true,
  defaultUnevaluatedProperties: false,
};

const ajvStrict = new (Ajv as any)({
  ...ajvBaseOptions,
  discriminator: true,
});

const ajvWithoutDiscriminator = new (Ajv as any)({
  ...ajvBaseOptions,
  discriminator: false,
});

const DISCRIMINATOR_VARIANT_THRESHOLD = 100;

function isDiscriminatorLarge(
  discr: Record<string, unknown>,
  sch: Record<string, unknown>,
  threshold: number
): boolean {
  if (isPlainObject(discr.mapping) && Object.keys(discr.mapping).length >= threshold) {
    return true;
  }

  const variants = Array.isArray(sch.oneOf)
    ? sch.oneOf
    : Array.isArray(sch.anyOf)
      ? sch.anyOf
      : undefined;

  if (!variants) {
    return false;
  }

  if (variants.length >= threshold) {
    return true;
  }

  const propertyName = discr.propertyName;
  if (typeof propertyName === 'string') {
    return variants.some((variant) => {
      const prop = (variant as Record<string, unknown>)?.properties as
        | Record<string, unknown>
        | undefined;
      const targetProp = prop?.[propertyName] as Record<string, unknown> | undefined;
      return Array.isArray(targetProp?.enum) && targetProp.enum.length >= threshold;
    });
  }

  return false;
}

export function hasLargeDiscriminator(
  schema: unknown,
  threshold = DISCRIMINATOR_VARIANT_THRESHOLD,
  visited = new Set<unknown>()
): boolean {
  if (!schema || visited.has(schema)) {
    return false;
  }

  if (Array.isArray(schema)) {
    visited.add(schema);
    return schema.some((item) => hasLargeDiscriminator(item, threshold, visited));
  }

  if (!isPlainObject(schema)) {
    return false;
  }
  visited.add(schema);

  const sch = schema as Record<string, unknown>;
  if (isPlainObject(sch.discriminator) && isDiscriminatorLarge(sch.discriminator, sch, threshold)) {
    return true;
  }

  for (const value of Object.values(sch)) {
    if (hasLargeDiscriminator(value, threshold, visited)) {
      return true;
    }
  }

  return false;
}

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
  const descriptionResponseByCode =
    descriptionOperation?.responses[String($response?.statusCode)] ||
    descriptionOperation?.responses['default'];

  const schemaFromDescription = $response?.contentType
    ? resolveContentByType(descriptionResponseByCode?.content, $response.contentType)?.schema
    : undefined;
  const isSchemaWithCircularRef = checkCircularRefsInSchema(schemaFromDescription);

  if (isSchemaWithCircularRef) {
    ctx.options.logger.output(`${yellow('WARNING: schema have circular references')}`);
    ctx.options.logger.printNewLine();
  }

  if (schemaFromDescription && !isSchemaWithCircularRef) {
    const useDiscriminator = !hasLargeDiscriminator(schemaFromDescription);
    const ajv = useDiscriminator ? ajvStrict : ajvWithoutDiscriminator;

    try {
      const validate = ajv.compile(schemaFromDescription as JSONSchemaType<unknown>);
      checks.push({
        name: CHECKS.SCHEMA_CHECK,
        passed: validate.call(ajvContext, resultBody),
        message: validate.errors
          ? printAjvErrors(
              schemaFromDescription as JSONSchemaType<unknown>,
              resultBody,
              validate.errors
            )
          : '',
        severity: ctx.severity['SCHEMA_CHECK'],
      });
    } catch (error: any) {
      if (
        useDiscriminator &&
        (error instanceof RangeError ||
          (typeof error?.message === 'string' &&
            error.message.includes('Maximum call stack size exceeded')))
      ) {
        try {
          const fallbackValidate = ajvWithoutDiscriminator.compile(
            schemaFromDescription as JSONSchemaType<unknown>
          );
          checks.push({
            name: CHECKS.SCHEMA_CHECK,
            passed: fallbackValidate.call(ajvContext, resultBody),
            message: fallbackValidate.errors
              ? printAjvErrors(
                  schemaFromDescription as JSONSchemaType<unknown>,
                  resultBody,
                  fallbackValidate.errors
                )
              : '',
            severity: ctx.severity['SCHEMA_CHECK'],
          });
          return;
        } catch {
          // Fall through to record original error if fallback also fails
        }
      }

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
  const responseCodesFromDescription = Object.keys(descriptionOperation?.responses || {});
  const matchesCodeFromDescription =
    responseStatusCode &&
    responseCodesFromDescription
      .map((item) => item.toString())
      .includes(responseStatusCode.toString());

  const matchesDefaultResponse = responseCodesFromDescription.includes('default');

  const message = matchesCodeFromDescription
    ? dim(`List of valid response codes are inferred from description \n\n`) +
      statusCodeDiff(`${responseStatusCode}`, responseCodesFromDescription.map(String))
    : ''; // NOTE: we don't show any diff if response code hits default response

  const passed = matchesCodeFromDescription || matchesDefaultResponse;

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

function contentTypeMatchesPattern(contentType: string, pattern: string): boolean {
  const normalizedPattern = pattern.toLowerCase();
  const normalizedContentType = contentType.toLowerCase();

  if (normalizedPattern === '*/*') return true;
  if (normalizedPattern === normalizedContentType) return true;

  const [patternType, patternSubtype] = normalizedPattern.split('/');
  const [actualType, actualSubtype] = normalizedContentType.split('/');

  if (patternType === '*') {
    return patternSubtype === '*' || patternSubtype === actualSubtype;
  }

  if (patternSubtype === '*') {
    return patternType === actualType;
  }

  return false;
}

type ResponseContent = NonNullable<Oas3Responses[string]['content']>;

export function resolveContentByType(
  content: ResponseContent | undefined,
  contentType: string
): ResponseContent[string] | undefined {
  if (!content) return undefined;
  if (content[contentType]) return content[contentType];

  for (const pattern of Object.keys(content)) {
    if (contentTypeMatchesPattern(contentType, pattern)) {
      return content[pattern];
    }
  }
  return undefined;
}

function checkContentTypeFromDescription({
  checks,
  descriptionOperation,
  $response,
  ctx,
}: DescriptionChecks & { ctx: TestContext }): void {
  const statusCode = $response?.statusCode;
  const responseContentType = $response?.contentType;
  const possibleContentTypesFromDescription = Object.keys(
    descriptionOperation?.responses[statusCode]?.content || {}
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

export function statusCodeDiff<E = unknown>(actual: unknown, expected: E[]) {
  const pass = expected.includes(actual as E);
  const expectedText = expected.join(', ');
  const receivedText = String(actual);

  return `Expected value to be in the list:\n  ${expectedText}\nReceived:\n  ${
    pass ? green(receivedText) : red(receivedText)
  }`;
}
