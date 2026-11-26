import { isPlainObject } from '@redocly/openapi-core';
import * as path from 'node:path';

import { type TestContext, type RequestBody } from '../../types.js';

const KNOWN_BINARY_CONTENT_TYPES_REGEX =
  /^image\/(png|jpeg|gif|bmp|webp|svg\+xml)|application\/pdf$/;

export function stripFileDecorator(payload: string) {
  return payload.startsWith('$file(') && payload.endsWith(')')
    ? payload.substring(7, payload.length - 2)
    : payload;
}

// Replaces each `$file(...)` reference of a multipart payload with the file it points to.
// It runs before the payload is evaluated, so only a reference written in the description loads a file.
async function loadFiles(
  payload: Record<string, unknown>,
  ctx: TestContext
): Promise<Record<string, unknown>> {
  const entries = await Promise.all(
    Object.entries(payload).map(async ([key, item]) => [key, await loadFile(item, ctx)] as const)
  );

  return Object.fromEntries(entries);
}

async function loadFile(item: unknown, ctx: TestContext): Promise<unknown> {
  if (typeof item === 'string' && item.startsWith('$file(') && item.endsWith(')')) {
    const filePath = path.resolve(path.dirname(ctx.options.filePath), stripFileDecorator(item));

    return ctx.options.requestFileLoader.getFileBody(filePath);
  } else if (Array.isArray(item)) {
    return Promise.all(item.map((arrayItem) => loadFile(arrayItem, ctx)));
  } else if (isPlainObject(item)) {
    return loadFiles(item, ctx);
  }

  return item;
}

// Encodes an evaluated multipart payload as a form: a nested object becomes `parent[child]` fields.
// The files go after the other fields, where a server can require them to be.
export function createFormData(payload: Record<string, unknown>): FormData {
  const formData = new FormData();
  const files: [string, Blob][] = [];

  appendFields(payload, formData, files);
  for (const [formKey, file] of files) {
    formData.append(formKey, file);
  }

  return formData;
}

function appendFields(
  payload: Record<string, unknown>,
  formData: FormData,
  files: [string, Blob][],
  parentKey?: string
) {
  for (const [key, item] of Object.entries(payload)) {
    const formKey = parentKey ? `${parentKey}[${key}]` : key;

    if (item instanceof Blob) {
      files.push([formKey, item]);
    } else if (Array.isArray(item)) {
      item.forEach((arrayItem, index) => {
        if (arrayItem instanceof Blob) {
          files.push([formKey, arrayItem]);
        } else if (isPlainObject(arrayItem)) {
          // An object in a list becomes `parent[0][child]` fields.
          appendFields({ [index]: arrayItem }, formData, files, formKey);
        } else {
          formData.append(formKey, String(arrayItem));
        }
      });
    } else if (isPlainObject(item)) {
      appendFields(item, formData, files, formKey);
    } else if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
      formData.append(formKey, String(item));
    }
  }
}

const getRequestBodyOctetStream = async (payload: RequestBody['payload'], ctx: TestContext) => {
  if (typeof payload === 'string' && payload.startsWith('$file(') && payload.endsWith(')')) {
    const filePath = path.resolve(path.dirname(ctx.options.filePath), stripFileDecorator(payload));

    return ctx.options.requestFileLoader.getFileBody(filePath);
  } else {
    return payload;
  }
};

export async function parseRequestBody(
  stepRequestBody: RequestBody | undefined,
  ctx: TestContext,
  descriptionContentType?: string
): Promise<
  Omit<RequestBody, 'payload'> & {
    payload?:
      | string
      | number
      | boolean
      | Record<string, unknown>
      | Array<unknown>
      | BodyInit
      | FormData
      | URLSearchParams;
  }
> {
  if (!stepRequestBody) {
    return {
      payload: undefined,
      contentType: undefined,
      encoding: undefined,
      replacements: undefined,
    };
  }

  const { payload, contentType } = stepRequestBody;

  if ((contentType || descriptionContentType) === 'multipart/form-data' && isPlainObject(payload)) {
    return {
      ...stepRequestBody,
      payload: await loadFiles(payload, ctx),
    };
  } else if (
    contentType === 'application/octet-stream' ||
    (typeof contentType === 'string' && KNOWN_BINARY_CONTENT_TYPES_REGEX.test(contentType))
  ) {
    return {
      ...stepRequestBody,
      payload: await getRequestBodyOctetStream(payload, ctx),
      contentType: 'application/octet-stream',
    };
  } else if (contentType === 'application/x-www-form-urlencoded' && typeof payload === 'string') {
    return {
      ...stepRequestBody,
      payload: Object.fromEntries(new URLSearchParams(payload).entries()),
      contentType: 'application/x-www-form-urlencoded',
    };
  }

  return stepRequestBody;
}
