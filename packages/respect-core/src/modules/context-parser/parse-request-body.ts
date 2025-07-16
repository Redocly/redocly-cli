import path from '../../utils/path.js';
import { type TestContext, type RequestBody } from '../../types.js';

const KNOWN_BINARY_CONTENT_TYPES_REGEX =
  /^image\/(png|jpeg|gif|bmp|webp|svg\+xml)|application\/pdf$/;

export function stripFileDecorator(payload: string) {
  return payload.startsWith('$file(') && payload.endsWith(')')
    ? payload.substring(7, payload.length - 2)
    : payload;
}

const appendFileToFormData = async (
  formData: FormData,
  key: string,
  item: string,
  workflowFilePath: string,
  ctx: TestContext
): Promise<void> => {
  const currentArazzoFileFolder = path.dirname(workflowFilePath);
  const filePath = path.resolve(currentArazzoFileFolder, stripFileDecorator(item));

  formData.append(key, await ctx.requestFileLoader.getFileBody(filePath));
};

const appendObjectToFormData = (
  promises: Promise<void>[],
  formData: FormData,
  payload: Record<string, any>,
  workflowFilePath: string,
  ctx: TestContext,
  parentKey?: string
) => {
  Object.entries(payload).forEach(([key, item]) => {
    const formKey = parentKey ? `${parentKey}[${key}]` : key;

    if (typeof item === 'string' && item.startsWith('$file(') && item.endsWith(')')) {
      promises.push(appendFileToFormData(formData, formKey, item, workflowFilePath, ctx));
    } else if (Array.isArray(item)) {
      item.forEach((i) => {
        if (typeof i === 'string' && i.startsWith('$file(') && i.endsWith(')')) {
          promises.push(appendFileToFormData(formData, formKey, i, workflowFilePath, ctx));
        } else {
          formData.append(formKey, i.toString());
        }
      });
    } else if (typeof item === 'object' && item !== null) {
      appendObjectToFormData(promises, formData, item, workflowFilePath, ctx, formKey);
    } else if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
      formData.append(formKey, item.toString());
    }
  });
};

const getRequestBodyMultipartFormData = async (
  payload: RequestBody['payload'],
  formData: FormData,
  workflowFilePath: string,
  ctx: TestContext
) => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const promises: Promise<void>[] = [];
    appendObjectToFormData(promises, formData, payload, workflowFilePath, ctx);
    await Promise.all(promises);
  }
};

const getRequestBodyOctetStream = async (payload: RequestBody['payload'], ctx: TestContext) => {
  if (typeof payload === 'string' && payload.startsWith('$file(') && payload.endsWith(')')) {
    // fixme, remove this
    const filePath = path.resolve(
      path.dirname(ctx.options.workflowPath),
      stripFileDecorator(payload)
    );

    return ctx.requestFileLoader.getFileBody(filePath);
  } else {
    return payload;
  }
};

export async function parseRequestBody(
  stepRequestBody: RequestBody | undefined,
  ctx: TestContext
): Promise<
  Omit<RequestBody, 'payload'> & {
    payload:
      | string
      | number
      | boolean
      | Record<string, any>
      | BodyInit
      | FormData
      | URLSearchParams
      | undefined;
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

    await getRequestBodyMultipartFormData(payload, formData, workflowFilePath, ctx);

    return {
      ...stepRequestBody,
      payload: formData,
      // contentType: `multipart/form-data; boundary=${formData.getBoundary()}`,
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
