import { createReadStream, constants, access } from 'node:fs';
import * as path from 'node:path';
import FormData = require('form-data');
import { handlePayloadReplacements } from './handle-request-body-replacements';
import * as querystring from 'node:querystring';
import { type RequestBody } from '../../types';

const KNOWN_BINARY_CONTENT_TYPES_REGEX =
  /^image\/(png|jpeg|gif|bmp|webp|svg\+xml)|application\/pdf$/;

export function stripFileDecorator(payload: string) {
  return payload.startsWith('$file(') && payload.endsWith(')')
    ? payload.substring(7, payload.length - 2)
    : payload;
}

const appendFileToFormData = (formData: FormData, key: string, item: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const filePath = path.resolve(__dirname, '../', stripFileDecorator(item));

    access(filePath, constants.F_OK | constants.R_OK, (err) => {
      if (err) {
        const relativePath = path.relative(process.cwd(), filePath);
        reject(new Error(`File ${relativePath} doesn't exist or isn't readable.`));
      } else {
        formData.append(key, createReadStream(filePath));
        resolve();
      }
    });
  });
};

const appendObjectToFormData = (
  promises: Promise<void>[],
  formData: FormData,
  payload: Record<string, any>,
  parentKey?: string
) => {
  Object.entries(payload).forEach(([key, item]) => {
    const formKey = parentKey ? `${parentKey}[${key}]` : key;

    if (typeof item === 'string' && item.startsWith('$file(') && item.endsWith(')')) {
      promises.push(appendFileToFormData(formData, formKey, item));
    } else if (Array.isArray(item)) {
      item.forEach((i) => {
        if (typeof i === 'string' && i.startsWith('$file(') && i.endsWith(')')) {
          promises.push(appendFileToFormData(formData, formKey, i));
        } else {
          formData.append(formKey, i.toString());
        }
      });
    } else if (typeof item === 'object' && item !== null) {
      appendObjectToFormData(promises, formData, item, formKey);
    } else if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
      formData.append(formKey, item.toString());
    }
  });
};

const getRequestBodyMultipartFormData = async (
  payload: RequestBody['payload'],
  formData: FormData
) => {
  // TODO: handle other than object payload type
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const promises: Promise<void>[] = [];
    appendObjectToFormData(promises, formData, payload);
    await Promise.all(promises);
  }
};

const getRequestBodyOctetStream = async (payload: RequestBody['payload']) => {
  if (typeof payload === 'string' && payload.startsWith('$file(') && payload.endsWith(')')) {
    const filePath = path.resolve(__dirname, '../', stripFileDecorator(payload));

    await new Promise((resolve, reject) => {
      access(filePath, constants.F_OK | constants.R_OK, (err) => {
        if (err) {
          const relativePath = path.relative(process.cwd(), filePath);
          reject(new Error(`File ${relativePath} doesn't exist or isn't readable.`));
        } else {
          resolve(filePath);
        }
      });
    });
    return createReadStream(filePath);
  } else {
    return payload;
  }
};

export async function parseRequestBody(stepRequestBody: RequestBody | undefined): Promise<{
  payload: any | undefined;
  contentType: string | undefined;
  encoding: string | undefined;
}> {
  if (!stepRequestBody) {
    return {
      payload: undefined,
      contentType: undefined,
      encoding: undefined,
    };
  }

  const { payload, encoding, contentType, replacements } = stepRequestBody;

  if (contentType === 'multipart/form-data') {
    const formData = new FormData();

    await getRequestBodyMultipartFormData(payload, formData);

    return {
      payload: formData,
      contentType: `multipart/form-data; boundary=${formData.getBoundary()}`,
      encoding,
    };
  } else if (
    contentType === 'application/octet-stream' ||
    (typeof contentType === 'string' && KNOWN_BINARY_CONTENT_TYPES_REGEX.test(contentType))
  ) {
    return {
      payload: await getRequestBodyOctetStream(payload),
      contentType: 'application/octet-stream',
      encoding,
    };
  }

  let resolvedPayload = payload;

  if (replacements) {
    // To handle string replacement properly with variables it's better to parse
    // the string into an object and process the replacement.
    // Also resolves query string variables before sending.
    if (typeof resolvedPayload === 'string') {
      resolvedPayload = querystring.parse(resolvedPayload);
    }

    if (typeof resolvedPayload === 'object') {
      handlePayloadReplacements(resolvedPayload, replacements);
    }
  }

  return {
    payload: resolvedPayload,
    contentType,
    encoding,
  };
}
