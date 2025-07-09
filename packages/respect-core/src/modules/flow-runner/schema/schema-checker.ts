import Ajv, { type JSONSchemaType } from '@redocly/ajv/dist/2020.js';
import { diffLinesUnified } from 'jest-diff';
import { blue, dim, red, yellow } from 'colorette';
import {
  type Check,
  type DescriptionChecks,
  type StepCallContext,
  type TestContext,
} from '../../../types.js';
import { CHECKS } from '../../checks/index.js';
import { printErrors as printAjvErrors } from '../../../utils/ajv-errors.js';
import { checkCircularRefsInSchema } from '../../../utils/check-circular-refs-in-schema.js';
import { removeWriteOnlyProperties } from '../../description-parser/index.js';

const ajvStrict = new Ajv({
  schemaId: '$id',
  meta: true,
  allErrors: true,
  strictSchema: false,
  inlineRefs: false,
  validateSchema: false,
  discriminator: true,
  allowUnionTypes: true,
  validateFormats: false,
  logger: false,
  verbose: true,
  defaultUnevaluatedProperties: false,
});

export function checkSchema({
  stepCallCtx,
  descriptionOperation,
  ctx,
}: {
  stepCallCtx: StepCallContext;
  descriptionOperation?: any;
  ctx: TestContext;
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

  checkSchemaFromDescription({ checks, descriptionOperation, $response, ctx });

  return checks;
}

function checkSchemaFromDescription({
  checks,
  descriptionOperation,
  $response,
  ctx,
}: DescriptionChecks & { ctx: TestContext }): void {
  const { body: resultBody } = $response;
  const descriptionResponseByCode =
    descriptionOperation?.responses[String($response?.statusCode)] ||
    descriptionOperation?.responses['default'];

  const schemaFromDescription = $response?.contentType
    ? descriptionResponseByCode?.content?.[$response.contentType]?.schema
    : undefined;
  const isSchemaWithCircularRef = checkCircularRefsInSchema(schemaFromDescription);

  if (isSchemaWithCircularRef) {
    ctx.options.logger.output(`${yellow('WARNING: schema have circular references')}`);
    ctx.options.logger.printNewLine();
  }

  if (schemaFromDescription && !isSchemaWithCircularRef) {
    try {
      checks.push({
        name: CHECKS.SCHEMA_CHECK,
        passed: ajvStrict.validate(
          removeWriteOnlyProperties(schemaFromDescription as JSONSchemaType<unknown>),
          resultBody
        ),
        message: ajvStrict.errors
          ? printAjvErrors(
              removeWriteOnlyProperties(schemaFromDescription as JSONSchemaType<unknown>),
              resultBody,
              ajvStrict.errors
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
  const responseCodesFromDescription = Object.keys(descriptionOperation?.responses || {});
  const matchesCodeFromDescription =
    responseStatusCode &&
    responseCodesFromDescription
      .map((item) => item.toString())
      .includes(responseStatusCode.toString());

  const matchesDefaultResponse = responseCodesFromDescription.includes('default');

  const message = matchesCodeFromDescription
    ? dim(`List of valid response codes are inferred from description \n\n`) +
      diffLinesUnified(responseCodesFromDescription.map(String), [`${responseStatusCode}`])
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

  if (responseContentType && !possibleContentTypesFromDescription.includes(responseContentType)) {
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
