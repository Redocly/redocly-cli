import { red } from 'colorette';

import type { RuntimeExpressionContext, TestContext, Workflow } from '../../types.js';
import type { LoggerInterface } from '@redocly/openapi-core';

export interface ParsedParameters {
  queryParams: Record<string, string>;
  pathParams: Record<string, string | number>;
  headerParams: Record<string, string>;
}

const hasCurlyBraces = (input: string) => {
  return /\{.*?\}/.test(input);
};

export function getValueFromContext({
  value,
  ctx,
  logger,
}: {
  value: any;
  ctx: TestContext | RuntimeExpressionContext;
  logger: LoggerInterface;
}): any {
  if (!value) return value;

  if (typeof value === 'object') {
    for (const key in value) {
      value[key] = getValueFromContext({ value: value[key], ctx, logger });
    }
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value.toString().startsWith('$faker.')) {
    return getFakeData({ pointer: value.slice(1), ctx, logger });
  }

  if (hasCurlyBraces(value)) {
    // multiple variables in string => {$var1} {$var2}
    return replaceVariablesInString(value, ctx, logger);
  } else {
    // single variable in string => $var1
    return resolveValue(value, ctx, logger);
  }
}

export function replaceFakerVariablesInString(
  input: string,
  ctx: TestContext | RuntimeExpressionContext,
  logger: LoggerInterface
) {
  const startIndex = input.indexOf('{');

  if (startIndex !== -1) {
    const substringAfterFirstBrace = input.substring(startIndex + 1);
    const fakerFunction = substringAfterFirstBrace.slice(0, -1);
    const fakerValue = getFakeData({ pointer: fakerFunction.slice(1), ctx, logger });

    return fakerValue && input.replace(/{(.*)}/, fakerValue);
  } else {
    return input;
  }
}

function runInContext(code: string, context: any) {
  const contextKeys = Object.keys(context);
  const contextValues = Object.values(context);

  return new Function(...contextKeys, `return ${code}`)(...contextValues);
}

function replaceVariablesInString(
  input: string,
  ctx: TestContext | RuntimeExpressionContext,
  logger: LoggerInterface
): string {
  // Regular expression to match content inside ${...}
  const regex = /\{\$(\{[^{}]*\}|[^{}])*\}/g;
  let result = input;

  // Replace each match with its interpolated value
  result = result.replace(regex, (match, _code) => {
    return interpolate(match, ctx, logger);
  });

  return result;
}

function interpolate(
  part: string,
  ctx: TestContext | RuntimeExpressionContext,
  logger: LoggerInterface
): string {
  if (!part.includes('$')) return part;

  if (part.includes('$faker.')) {
    return replaceFakerVariablesInString(part, ctx, logger);
  }

  const value = getFrom(ctx)(removeFigureBrackets(part));
  return value !== undefined ? value : '';
}

const resolveValue = (
  value: string | null,
  ctx: TestContext | RuntimeExpressionContext,
  logger: LoggerInterface
) => {
  if (!value) return value;

  const path = value.toString();

  if (!path.includes('$')) {
    return value;
  }

  // if path has $file('...') syntax, return the path but trim the $file(' and ')
  if (path.startsWith('$file(') && path.endsWith(')')) {
    return path.slice(7, -2);
  }

  // $sourceDescriptions.<name>.workflows.<workflowId>
  if (path.startsWith('$sourceDescriptions.') && path.includes('.workflows.')) {
    const parts = path.split('.');

    const sourceDescriptionName = parts[1];
    const workflowId = parts[3];

    if (!sourceDescriptionName || !workflowId) {
      return undefined;
    }

    const sourceDescriptions = getFrom(ctx)('$sourceDescriptions');

    if (!sourceDescriptions[sourceDescriptionName]) {
      return undefined;
    }

    return sourceDescriptions[sourceDescriptionName].workflows.find(
      (workflow: Workflow) => workflow.workflowId === workflowId
    );
  }

  if (path && path.trim().startsWith('faker.')) {
    return getFakeData({ pointer: path, ctx, logger });
  }

  return path
    ? getFrom(ctx)(replaceSquareBrackets(path))
    : path.replace(/\$\{([^}]+)}/g, (_, path) => getFrom(ctx)(replaceSquareBrackets(path)));
};

function removeFigureBrackets(input: string) {
  return input.replace(/\{(.*)\}/, '$1');
}

function replaceSquareBrackets(input: string) {
  return input.replace(/\['(.*?)'\]/g, '.$1');
}

const getFrom =
  ($: Record<string, unknown> | any, originalPointer: string = '') =>
  (pointer: string): any => {
    if (!originalPointer) {
      originalPointer = pointer; // Store the first pointer only during the initial call
    }

    if (!pointer) return $;
    const [key, ...rest] = pointer.split('.');

    if (!$) {
      throw Error(`Cannot get ${red(key)} from ${red(originalPointer)}`);
    }

    if ($?.[key] === undefined) {
      const reason = ` Undefined ${red(key)} at ${red(originalPointer)}.`;
      const additionalInfo = Object.keys($).length
        ? `Did you mean to use another key? Available keys:\n${Object.keys($).join(', ')}.\n`
        : '';
      const errorMessage = `${reason} ${additionalInfo}`;

      throw Error(errorMessage);
    }

    return getFrom($[key], originalPointer)(rest.join('.'));
  };

export function getFakeData({
  pointer,
  ctx,
  logger,
}: {
  pointer: string;
  ctx: TestContext | RuntimeExpressionContext;
  logger: LoggerInterface;
}): any {
  const segments = pointer.split('.');
  const fakerContext = { ctx: { faker: ctx.$faker } };

  try {
    const escapedSegments = segments
      .map((segment) => segment.trim())
      .map((segment, idx) =>
        // Dumb function check (if ends by ')'), if function goes first dont need to put '.',
        // if goes second and so on - must be prepended by '.', like ["escaped-field"].func()
        segment.endsWith(')') ? `${idx == 0 ? '' : '.'}${segment}` : `["${segment}"]`
      )
      .join('');

    return runInContext(`ctx${escapedSegments}`, fakerContext);
  } catch (err: any) {
    logger.error(red(err.toString()));

    return undefined;
  }
}

function modifyJSON(
  value: any,
  ctx: TestContext | RuntimeExpressionContext,
  logger: LoggerInterface
): any {
  if (typeof value === 'string') {
    if (value) return getValueFromContext({ value, ctx, logger });
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'undefined' ||
    value === null
  )
    return;

  for (const i in value as Record<string, unknown> | unknown[]) {
    if (typeof value[i] === 'string') {
      if (value[i]) value[i] = getValueFromContext({ value: value[i], ctx, logger });
    } else {
      modifyJSON(value[i], ctx, logger);
    }
  }
}

export function parseJson(
  objectToResolve: any,
  ctx: TestContext | RuntimeExpressionContext,
  logger: LoggerInterface
): any {
  return modifyJSON(objectToResolve, ctx, logger) || objectToResolve;
}

export function resolvePath(
  path?: string,
  pathParams?: Record<string, string | number | boolean>
): string | undefined {
  if (!path) return;

  const paramsWithBraces: Record<string, string | number> = {};
  for (const param in pathParams) {
    paramsWithBraces[`{${param}}`] = String(pathParams[param]);
  }
  return path
    .split(/(\{[a-zA-Z0-9_.-]+\}+)/g)
    .map((key) => (paramsWithBraces[key] ? paramsWithBraces[key] : key))
    .join('');
}
