import * as dotenv from 'dotenv';
import * as path from 'node:path';
import * as fs from 'node:fs';

export function readEnvVariables(executionFilePath?: string) {
  if (executionFilePath) {
    let currentDir = path.dirname(executionFilePath);

    while (currentDir !== path.resolve(currentDir, '..')) {
      const envFilePath = path.join(currentDir, '.env');

      if (fs.existsSync(envFilePath)) {
        dotenv.config({ path: envFilePath });
        break;
      }

      currentDir = path.resolve(currentDir, '..');
    }
  }

  return process.env as Record<string, string>;
}
