import { logger } from '@redocly/openapi-core';
import * as process from 'node:process';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export class Spinner {
  private readonly frames: string[];
  private currentFrame: number;
  private intervalId: NodeJS.Timeout | null;
  private message: string;

  constructor() {
    this.frames = SPINNER_FRAMES;
    this.currentFrame = 0;
    this.intervalId = null;
    this.message = '';
  }

  private showFrame() {
    logger.info('\r' + this.frames[this.currentFrame] + ' ' + this.message);
    this.currentFrame = (this.currentFrame + 1) % this.frames.length;
  }

  start(message: string) {
    if (this.message === message) {
      return;
    }

    this.message = message;
    // If we're not in a TTY, don't display the spinner.
    if (!process.stderr.isTTY) {
      logger.info(`${message}...\n`);
      return;
    }

    if (this.intervalId === null) {
      this.intervalId = setInterval(() => {
        this.showFrame();
      }, 100);
    }
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('\r');
    }
    this.message = '';
  }
}

export function finishProgress(spinner: Spinner): void {
  spinner.stop();
  if (process.stderr.isTTY) {
    // Erase the leftover spinner frame so the result line prints clean.
    logger.info('\x1b[2K');
  }
}

/**
 * Render one spinner line for concurrent workers: the first in-flight label,
 * how many more run alongside it, and the position in the total.
 */
export function showConcurrentProgress(
  spinner: Spinner,
  options: { action: string; inFlight: Set<string>; position: number; total: number }
): void {
  const [firstLabel] = options.inFlight;
  if (!firstLabel) {
    return;
  }
  const others = options.inFlight.size > 1 ? ` (+${options.inFlight.size - 1} more)` : '';
  spinner.start(`[${options.position}/${options.total}] ${options.action} ${firstLabel}${others}`);
}
