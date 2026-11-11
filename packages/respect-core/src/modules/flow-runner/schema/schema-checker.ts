import Ajv, { type JSONSchemaType, type Context as AjvContext } from '@redocly/ajv/dist/2020.js';
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
import {
  contentTypeMatchesPattern,
  getResponseKeyByStatusCode,
  getResponseSchema,
} from '../../description-parser/index.js';

const ajvStrict = new (Ajv as any)({
  schemaId: '$id',
  meta: true,
  allErrors: true,
  strictSchema: false,
  inlineRefs: false,
  validateSchema: false,
  discriminator: true,
  allowUnionTypes: true,
  validateFormats: true,
  passContext: true,
  logger: false,
  verbose: true,
  defaultUnevaluatedProperties: false,
});

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
  const schemaFromDescription = $response?.contentType
    ? getResponseSchema({
        statusCode: $response.statusCode,
        contentType: $response.contentType,
        descriptionResponses: descriptionOperation?.responses,
      })
    : undefined;
  const isSchemaWithCircularRef = checkCircularRefsInSchema(schemaFromDescription);

  if (isSchemaWithCircularRef) {
    ctx.options.logger.output(`${yellow('WARNING: schema have circular references')}`);
    ctx.options.logger.printNewLine();
  }

  if (schemaFromDescription && !isSchemaWithCircularRef) {
    try {
      const validate = ajvStrict.compile(schemaFromDescription as JSONSchemaType<unknown>);
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

export function statusCodeDiff<E = unknown>(actual: unknown, expected: E[]) {
  const pass = expected.includes(actual as E);
  const expectedText = expected.join(', ');
  const receivedText = String(actual);

  return `Expected value to be in the list:\n  ${expectedText}\nReceived:\n  ${
    pass ? green(receivedText) : red(receivedText)
  }`;
}
