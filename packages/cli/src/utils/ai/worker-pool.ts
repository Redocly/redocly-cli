import { logger } from '@redocly/openapi-core';

import { finishProgress, showConcurrentProgress, Spinner } from '../spinner.js';
import { CliNotFoundError } from './providers.js';

export interface WorkerPoolOptions<ItemType, ResultType> {
  items: ItemType[];
  /** How many items run against the provider at once. */
  concurrency: number;
  /** Spinner verb, for example "Refining" or "Designing". */
  action: string;
  /** Completion line wording, for example "refined". */
  successNote: string;
  /** Failure line wording, for example "kept the baseline" or "skipped". */
  failureNote: string;
  label: (item: ItemType) => string;
  run: (item: ItemType, index: number) => Promise<ResultType>;
}

/**
 * Run one provider-backed task per item with a shared progress spinner.
 * A failed item logs a warning and yields `null` in the result slot; a
 * missing provider CLI aborts the whole pool instead, since every remaining
 * item would fail the same way.
 */
export async function runWorkerPool<ItemType, ResultType>(
  options: WorkerPoolOptions<ItemType, ResultType>
): Promise<(ResultType | null)[]> {
  const { items } = options;
  const results: (ResultType | null)[] = new Array(items.length).fill(null);
  const spinner = new Spinner();
  const inFlight = new Set<string>();
  let completed = 0;
  let nextIndex = 0;
  let aborted = false;

  const updateSpinner = () =>
    showConcurrentProgress(spinner, {
      action: options.action,
      inFlight,
      position: completed + 1,
      total: items.length,
    });

  const worker = async () => {
    while (!aborted && nextIndex < items.length) {
      const index = nextIndex++;
      const item = items[index];
      const label = options.label(item);
      const startedAt = Date.now();
      inFlight.add(label);
      updateSpinner();
      try {
        results[index] = await options.run(item, index);
        completed += 1;
        inFlight.delete(label);
        finishProgress(spinner);
        logger.info(
          `[${completed}/${items.length}] ${label} — ${options.successNote} (${Math.round(
            (Date.now() - startedAt) / 1000
          )}s)\n`
        );
      } catch (error) {
        completed += 1;
        inFlight.delete(label);
        finishProgress(spinner);
        if (error instanceof CliNotFoundError) {
          aborted = true;
          throw error;
        }
        logger.warn(
          `[${completed}/${items.length}] ${label} — ${options.failureNote}: ${
            error instanceof Error ? error.message : String(error)
          }\n`
        );
      }
      updateSpinner();
    }
  };

  const workers = Math.max(1, Math.min(options.concurrency, items.length));
  // allSettled instead of all: when one worker aborts, the others finish the
  // item they are processing before the error propagates, so no worker is
  // still logging progress after the command has fallen back.
  for (const result of await Promise.allSettled(Array.from({ length: workers }, worker))) {
    if (result.status === 'rejected') {
      throw result.reason;
    }
  }

  return results;
}
