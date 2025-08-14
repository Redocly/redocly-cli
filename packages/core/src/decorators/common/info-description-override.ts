import * as path from 'node:path';
import { readFileAsStringSync } from '../../utils.js';
import { isAbsoluteUrl } from '../../ref-utils.js';

import type { Oas3Decorator, Oas2Decorator } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const InfoDescriptionOverride: Oas3Decorator | Oas2Decorator = ({ filePath }, config) => {
  return {
    Info: {
      leave(info, { report, location }: UserContext) {
        if (!filePath)
          throw new Error(
            `Parameter "filePath" is not provided for "info-description-override" rule`
          );

        try {
          let resolvedFilePath = filePath;
          if (!isAbsoluteUrl(filePath) && !path.isAbsolute(filePath) && config?.configPath) {
            const configDir = path.dirname(config.configPath);
            resolvedFilePath = path.resolve(configDir, filePath);
          }
          info.description = readFileAsStringSync(resolvedFilePath);
        } catch (e) {
          report({
            message: `Failed to read markdown override file for "info.description".\n${e.message}`,
            location: location.child('description'),
          });
        }
      },
    },
  };
};
