import { createReadStream, constants, access, type ReadStream } from 'node:fs';
import * as querystring from 'node:querystring';
import * as path from 'node:path';
import FormData from 'form-data';
import { type TestContext, type RequestBody } from '../../types.js';
import * as url from 'node:url';

const __internalDirname = import.meta.url
  ? path.dirname(url.fileURLToPath(import.meta.url))
  : __dirname;

const KNOWN_BINARY_CONTENT_TYPES_REGEX =
  /^image\/(png|jpeg|gif|bmp|webp|svg\+xml)|application\/pdf$/;

export function stripFileDecorator(payload: string) {
  return payload.startsWith('$file(') && payload.endsWith(')')
    ? payload.substring(7, payload.length - 2)
    : payload;
}

const appendFileToFormData = (
  formData: FormData,
  key: string,
  item: string,
  workflowFilePath: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const currentArazzoFileFolder = path.dirname(workflowFilePath);
    const filePath = path.resolve(currentArazzoFileFolder, stripFileDecorator(item));

    access(filePath, constants.F_OK | constants.R_OK, (err) => {
      if (err) {
        reject(new Error(`File ${filePath} doesn't exist or isn't readable.`));
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
  workflowFilePath: string,
  parentKey?: string
) => {
  Object.entries(payload).forEach(([key, item]) => {
    const formKey = parentKey ? `${parentKey}[${key}]` : key;

    if (typeof item === 'string' && item.startsWith('$file(') && item.endsWith(')')) {
      promises.push(appendFileToFormData(formData, formKey, item, workflowFilePath));
    } else if (Array.isArray(item)) {
      item.forEach((i) => {
        if (typeof i === 'string' && i.startsWith('$file(') && i.endsWith(')')) {
          promises.push(appendFileToFormData(formData, formKey, i, workflowFilePath));
        } else {
          formData.append(formKey, i.toString());
        }
      });
    } else if (typeof item === 'object' && item !== null) {
      appendObjectToFormData(promises, formData, item, workflowFilePath, formKey);
    } else if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
      formData.append(formKey, item.toString());
    }
  });
};

const getRequestBodyMultipartFormData = async (
  payload: RequestBody['payload'],
  formData: FormData,
  workflowFilePath: string
) => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const promises: Promise<void>[] = [];
    appendObjectToFormData(promises, formData, payload, workflowFilePath);
    await Promise.all(promises);
  }
};

const getRequestBodyOctetStream = async (payload: RequestBody['payload']) => {
  if (typeof payload === 'string' && payload.startsWith('$file(') && payload.endsWith(')')) {
    const filePath = path.resolve(__internalDirname, '../', stripFileDecorator(payload));

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

export async function parseRequestBody(
  stepRequestBody: RequestBody | undefined,
  ctx: TestContext
): Promise<
  Omit<RequestBody, 'payload'> & {
    payload: string | number | boolean | Record<string, any> | ReadStream | FormData | undefined;
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

  if (contentType === 'multipart/form-data') {
    const formData = new FormData();
    const workflowFilePath = path.resolve(ctx.options.workflowPath);

    await getRequestBodyMultipartFormData(payload, formData, workflowFilePath);

    return {
      ...stepRequestBody,
      payload: formData,
      contentType: `multipart/form-data; boundary=${formData.getBoundary()}`,
    };
  } else if (
    contentType === 'application/octet-stream' ||
    (typeof contentType === 'string' && KNOWN_BINARY_CONTENT_TYPES_REGEX.test(contentType))
  ) {
    return {
      ...stepRequestBody,
      payload: await getRequestBodyOctetStream(payload),
      contentType: 'application/octet-stream',
    };
  } else if (contentType === 'application/x-www-form-urlencoded' && typeof payload === 'string') {
    return {
      ...stepRequestBody,
      payload: querystring.parse(payload),
      contentType: 'application/x-www-form-urlencoded',
    };
  }

  return stepRequestBody;
}
