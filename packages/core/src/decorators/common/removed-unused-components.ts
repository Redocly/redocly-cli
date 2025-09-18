import type { PreprocessorConfig } from 'core/src/config';

export function isRemoveUnusedComponentsEnabled({
  removeInApi,
  removeInRoot,
}: {
  removeInApi: PreprocessorConfig;
  removeInRoot: boolean;
}) {
  if (!removeInApi && !removeInRoot) return false;

  if (!removeInApi) return removeInRoot;

  if (removeInApi === 'on') {
    return true;
  }

  return false;
}
