import { createConfig, type LoggerInterface } from '@redocly/openapi-core';
import { fileURLToPath } from 'node:url';

import { CHECKS } from '../modules/checks/index.js';
import { run, type RespectOptions } from '../run.js';
import type { RunFileResult, Step, WorkflowExecutionResult } from '../types.js';

const ARAZZO_FILE = fileURLToPath(new URL('./execution-timeout.arazzo.yaml', import.meta.url));

const SILENT_LOGGER: LoggerInterface = {
  info: () => {},
  warn: () => {},
  output: () => {},
  error: () => {},
  printNewLine: () => {},
  printSeparator: () => {},
  indent: (text) => text,
};

async function runOptions(
  workflowId: string,
  executionTimeout: number,
  fetch: typeof globalThis.fetch
): Promise<RespectOptions> {
  return {
    files: [ARAZZO_FILE],
    workflow: [workflowId],
    config: await createConfig({}),
    maxSteps: 100,
    maxFetchTimeout: 40_000,
    executionTimeout,
    requestFileLoader: { getFileBody: async () => new Blob() },
    logger: SILENT_LOGGER,
    fetch,
  };
}

function isWorkflowResult(entry: Step | WorkflowExecutionResult): entry is WorkflowExecutionResult {
  return 'type' in entry && entry.type === 'workflow';
}

function checkNames(results: RunFileResult[]): string[] {
  const stepsOf = (entries: (Step | WorkflowExecutionResult)[]): Step[] =>
    entries.flatMap((entry) => (isWorkflowResult(entry) ? stepsOf(entry.executedSteps) : [entry]));
  return results
    .flatMap((result) => stepsOf(result.executedWorkflows))
    .flatMap((step) => step.checks.map((check) => check.name));
}

function timeoutCheckCount(results: RunFileResult[]): number {
  return checkNames(results).filter((name) => name === CHECKS.GLOBAL_TIMEOUT_ERROR).length;
}

const failingFetch = async () => new Response('unavailable', { status: 503 });

const EMPTY_MENU = {
  object: 'list',
  page: {
    endCursor: null,
    startCursor: null,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 10,
    total: 0,
  },
  items: [],
};

describe('run with an execution timeout', () => {
  it('reports one request and the timeout that ends a retry wait', async () => {
    const fetch = vi.fn(failingFetch);

    const result = await run(await runOptions('retry-after-a-minute', 1_000, fetch));

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(timeoutCheckCount(result)).toBe(1);
    expect(result).toMatchObject([{ globalTimeoutError: true, totalRequests: 1 }]);
  });

  it('ends a shortened retry wait without another request when the timer fires early', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    try {
      const fetch = vi.fn(failingFetch);
      const resultPromise = run(await runOptions('retry-after-a-minute', 30_000, fetch));
      await vi.waitFor(() => expect(vi.getTimerCount()).toBe(1));

      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject([{ globalTimeoutError: true }]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports the timeout of a sub-workflow on the parent workflow', async () => {
    const result = await run(await runOptions('run-retry-after-a-minute', 1_000, failingFetch));

    expect(result).toMatchObject([
      { globalTimeoutError: true, executedWorkflows: [{ globalTimeoutError: true }] },
    ]);
  });

  it('reports the timeout of a dependency on the workflow that depends on it', async () => {
    const result = await run(
      await runOptions('depends-on-retry-after-a-minute', 1_000, failingFetch)
    );

    expect(result).toMatchObject([
      { globalTimeoutError: true, executedWorkflows: [{ globalTimeoutError: true }] },
    ]);
  });

  it('times out each run on its own deadline when runs overlap', async () => {
    let releaseLongRun: (response: Response) => void = () => {};
    const longRunResponse = new Promise<Response>((resolve) => {
      releaseLongRun = resolve;
    });
    const shortOptions = await runOptions('retry-often', 100, failingFetch);
    const longOptions = await runOptions('single-call', 60_000, () => longRunResponse);

    const shortRun = run(shortOptions);
    const longRun = run(longOptions);
    const shortResult = await shortRun;
    releaseLongRun(Response.json(EMPTY_MENU));
    const longResult = await longRun;

    expect(checkNames(shortResult)).toContain(CHECKS.GLOBAL_TIMEOUT_ERROR);
    expect(longResult).toMatchObject([{ hasProblems: false, globalTimeoutError: false }]);
  });
});

describe('run request count', () => {
  it('counts no request for the workflows that start after the execution timeout', async () => {
    const fetch = vi.fn(failingFetch);
    const options = await runOptions('retry-after-a-minute', 1_000, fetch);

    const result = await run({ ...options, workflow: undefined });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject([{ totalRequests: 1 }]);
  });

  it('counts no request for a retry that the step limit stops', async () => {
    const fetch = vi.fn(failingFetch);
    const options = await runOptions('retry-often', 60_000, fetch);

    const result = await run({ ...options, maxSteps: 2 });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject([{ totalRequests: 2 }]);
  });
});
