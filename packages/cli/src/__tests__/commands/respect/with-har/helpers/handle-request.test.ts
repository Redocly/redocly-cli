import { EventEmitter } from 'events';

import type { Dispatcher } from 'undici';

import { handleRequest } from '../../../../../commands/respect/har-logs/helpers/handle-request.js';

describe('handleRequest', () => {
  it('should handle undici request', () => {
    const input = {
      method: 'GET',
      url: 'https://api.example.com/test',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: 'test' }),
    } as unknown as Request;

    const harLog = new Map();
    const isUndici = true;
    const handler: Dispatcher.DispatchHandlers = {
      onConnect: vi.fn(),
      onHeaders: vi.fn(),
      onData: vi.fn(),
      onComplete: vi.fn(),
    };

    handleRequest({ input, handler, harLog, isUndici });
  });

  it('should handle node request', () => {
    const input = {
      method: 'GET',
      url: 'https://api.example.com/test',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: 'test' }),
    } as unknown as Request;

    const harLog = new Map();
    const isUndici = false;
    const handler = new EventEmitter();
    handler.on = vi.fn();
    handler.emit = vi.fn();

    handleRequest({ input, handler, harLog, isUndici });
  });

  it('should handle undici request with response data', () => {
    const input = {
      method: 'POST',
      url: 'https://api.example.com/test',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: 'test' }),
    } as unknown as Request;

    const harLog = new Map();
    const isUndici = true;
    const handler: Dispatcher.DispatchHandlers = {
      onConnect: vi.fn(),
      onHeaders: vi.fn(),
      onData: vi.fn(),
      onComplete: vi.fn(),
    };

    // Mock response data
    const responseHeaders = {
      'content-type': ['application/json'],
      'content-length': ['123'],
    };
    const responseData = Buffer.from(JSON.stringify({ response: 'data' }));

    const wrappedHandler = handleRequest({
      input,
      handler,
      harLog,
      isUndici,
    }) as Dispatcher.DispatchHandlers;

    // Simulate response events using the wrapped handler
    wrappedHandler?.onHeaders?.(200, responseHeaders as any, () => {}, {} as any);
    wrappedHandler?.onData?.(responseData);
    wrappedHandler?.onComplete?.({} as any);
  });

  it('should handle node request with response data', () => {
    const input = {
      method: 'POST',
      url: 'https://api.example.com/test',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: 'test' }),
    } as unknown as Request;

    const harLog = new Map();
    const isUndici = false;
    const handler = new EventEmitter();
    const onSpy = vi.fn();
    handler.on = onSpy;
    handler.emit = vi.fn();

    handleRequest({ input, handler, harLog, isUndici });

    // Verify event listeners are registered
    expect(onSpy).toHaveBeenCalledWith('response', expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith('data', expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith('end', expect.any(Function));

    // Get registered event handlers
    const [[, responseHandler], [, dataHandler], [, endHandler]] = onSpy.mock.calls;

    // Simulate response events
    const response = {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'content-length': '123',
      },
    };
    responseHandler(response);

    // Simulate data event
    const chunk = Buffer.from(JSON.stringify({ response: 'data' }));
    dataHandler(chunk);

    // Simulate end event
    endHandler();
  });

  it('should handle errors in undici request', () => {
    const input = {
      method: 'GET',
      url: 'https://api.example.com/test',
      headers: {},
      body: null,
    } as unknown as Request;

    const harLog = new Map();
    const isUndici = true;
    const handler: Dispatcher.DispatchHandlers = {
      onConnect: vi.fn(),
      onHeaders: vi.fn(),
      onData: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    };

    handleRequest({ input, handler, harLog, isUndici });

    // Simulate error
    const error = new Error('Network error');
    handler?.onError?.(error);
  });

  it('should handle errors in node request', () => {
    const input = {
      method: 'GET',
      url: 'https://api.example.com/test',
      headers: {},
      body: null,
    } as unknown as Request;

    const harLog = new Map();
    const isUndici = false;
    const handler = new EventEmitter();
    const onSpy = vi.fn();
    handler.on = onSpy;
    handler.emit = vi.fn();

    handleRequest({ input, handler, harLog, isUndici });

    // Find the error handler from all registered handlers
    const errorHandler = onSpy.mock.calls.find(([event]) => event === 'error')?.[1];
    expect(errorHandler).toBeDefined();

    // Simulate error event
    const error = new Error('Network error');
    errorHandler(error);

    // Verify HAR log was updated with error
    const [harEntry] = Array.from(harLog.values());
    expect(harEntry.log.entries[0].response).toMatchObject({
      status: 0,
      statusText: 'Network error',
    });
  });
});
