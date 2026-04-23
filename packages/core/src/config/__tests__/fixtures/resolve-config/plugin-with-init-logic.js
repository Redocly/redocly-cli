import util from 'node:util';

export default function pluginWithInitLogic() {
  util.deprecate(() => null);

  return {
    id: 'test-plugin-esm-init',
  };
}
