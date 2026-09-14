import { markerMessage } from './nested-import-helper.mjs';

export default function nestedImportPlugin() {
  return {
    id: 'nested-import-plugin',
    rules: {
      oas3: {
        marker: () => ({
          Info(_info, { report, location }) {
            report({ message: markerMessage, location });
          },
        }),
      },
    },
  };
}
