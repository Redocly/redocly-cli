import * as process from 'node:process';

/**
 * Sanitizes the input path by removing invalid characters.
 */
export const sanitizePath = (input: string): string => {
  return input.replace(/[^a-zA-Z0-9 ._\-:\\/@]/g, '');
};

/**
 * Sanitizes the input locale (ex. en-US) by removing invalid characters.
 */
export const sanitizeLocale = (input: string): string => {
  return input.replace(/[^a-zA-Z0-9@._-]/g, '');
};

/**
 * The command that runs a product package, such as `@redocly/framework`, and downloads it when needed.
 * The standalone binary embeds Bun and has no npx next to it, so it runs the package with `bun x`
 * on its own runtime: `BUN_BE_BUN` makes the binary act as the `bun` command.
 */
export function getPackageRunner(packageName: string) {
  const isBun = !!process.versions.bun;
  // npx is a batch file on Windows, which only runs through a shell.
  const shell = !isBun && process.platform === 'win32';
  const sanitize = (input: string | undefined, sanitizer: (input: string) => string) =>
    shell && input ? sanitizer(input) : input || '';

  if (isBun) {
    return {
      command: process.execPath,
      args: ['x', '--bun', packageName],
      env: { ...process.env, BUN_BE_BUN: '1' },
      sanitize,
      shell,
    };
  }

  return {
    command: shell ? 'npx.cmd' : 'npx',
    args: ['-y', packageName],
    env: process.env,
    sanitize,
    shell,
  };
}
