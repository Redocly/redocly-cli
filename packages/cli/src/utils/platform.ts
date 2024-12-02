export const sanitizePath = (input: string): string => {
  return input.replace(/[^a-zA-Z0-9 ._\-:\\/@]/g, '');
};

export const sanitizeLocale = (input: string): string => {
  return input.replace(/[^a-zA-Z0-9@._-]/g, '');
};

export function getPlatformArgs(argv: { path?: string; locale?: string; 'project-dir'?: string }) {
  const isWindowsPlatform = process.platform === 'win32';
  const npxExecutableName = isWindowsPlatform ? 'npx.cmd' : 'npx';

  const sanitizeIfWindows = (input: string | undefined, sanitizer: (input: string) => string) => {
    if (isWindowsPlatform && input) {
      return sanitizer(input);
    } else {
      return input;
    }
  };

  const path = sanitizeIfWindows(argv.path, sanitizePath);
  const locale = sanitizeIfWindows(argv.locale, sanitizeLocale);
  const projectDir = sanitizeIfWindows(argv['project-dir'], sanitizePath);

  return { npxExecutableName, path, locale, projectDir, shell: isWindowsPlatform };
}
