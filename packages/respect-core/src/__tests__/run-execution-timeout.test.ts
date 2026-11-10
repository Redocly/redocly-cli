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

describe('run with an execution timeout', () => {
  it('ends a retry wait when the execution timeout is reached', async () => {
    const fetch = vi.fn(failingFetch);
    const startedAt = Date.now();

    const result = await run(await runOptions('retry-after-a-minute', 1_000, fetch));

    expect(Date.now() - startedAt).toBeLessThan(4_000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(timeoutCheckCount(result)).toBe(1);
    expect(result).toMatchObject([{ globalTimeoutError: true }]);
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
    releaseLongRun(new Response('{}', { status: 200 }));
    const longResult = await longRun;

    expect(checkNames(shortResult)).toContain(CHECKS.GLOBAL_TIMEOUT_ERROR);
    expect(longResult).toMatchObject([{ hasProblems: false, globalTimeoutError: false }]);
  });
});
