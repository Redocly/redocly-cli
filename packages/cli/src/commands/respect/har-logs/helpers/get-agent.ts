import * as http from 'http';
import * as https from 'https';
import { Dispatcher } from 'undici';
import { getInputUrl } from './get-input-url.js';
import { handleRequest } from './handle-request.js';

const HarHttpAgent = createAgentClass(http.Agent);
const HarHttpsAgent = createAgentClass(https.Agent);

let globalHttpAgent: any;
let globalHttpsAgent: any;

// Add new Undici dispatcher
class HarDispatcher extends Dispatcher {
  constructor(opts?: any) {
    super(opts);
  }

  dispatch(options: Dispatcher.DispatchOptions, handler: Dispatcher.DispatchHandlers): boolean {
    // Handle HAR logging here similar to handleRequest
    handleRequest({ input: options, handler, harLog: new Map(), isUndici: true });
    return super.dispatch(options, handler);
  }
}

export function getAgent(input: any, options: any): any {
  // Add Undici dispatcher support
  if (options.dispatcher) {
    if (options.dispatcher instanceof Dispatcher) {
      return new HarDispatcher(options.dispatcher);
    }
    return options.dispatcher;
  }

  if (options.agent) {
    if (typeof options.agent === 'function') {
      return function (...args: any[]) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const agent = options.agent.call(this, ...args);
        if (agent) {
          instrumentAgentInstance(agent);
          return agent;
        }
        return getGlobalAgent(input);
      };
    }
    instrumentAgentInstance(options.agent);
    return options.agent;
  }
  return getGlobalAgent(input);
}

function getGlobalAgent(input: any): any {
  const url = getInputUrl(input);
  if (url.protocol === 'http:') {
    if (!globalHttpAgent) {
      globalHttpAgent = new HarHttpAgent();
    }
    return globalHttpAgent;
  }
  if (!globalHttpsAgent) {
    globalHttpsAgent = new HarHttpsAgent();
  }
  return globalHttpsAgent;
}

/**
 * Instrument an existing Agent instance. This overrides the instance's
 * `addRequest` method. It should be fine to continue using for requests made
 * without `withHar` - if the request doesn't have our `x-har-request-id`
 * header, it won't do anything extra.
 */
function instrumentAgentInstance(agent: any): void {
  const { addRequest: originalAddRequest } = agent;
  if (!originalAddRequest.isHarEnabled) {
    agent.addRequest = function addRequest(request: any, ...args: []) {
      handleRequest(request, ...args);
      return originalAddRequest.call(this, request, ...args);
    };
    agent.addRequest.isHarEnabled = true;
  }
}

function createAgentClass(BaseAgent: any): any {
  class HarAgent extends BaseAgent {
    constructor(...args: any[]) {
      super(...args);
      (this.addRequest as any).isHarEnabled = true;
    }

    addRequest(request: any, ...args: []): void {
      handleRequest(request, ...args);
      return super.addRequest(request, ...args);
    }
  }

  return HarAgent;
}
