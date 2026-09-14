export default function esmPlugin() {
  return {
    id: 'esm-plugin',
    rules: {
      oas3: {
        marker: () => ({
          Info(_info, { report, location }) {
            report({ message: 'esm-plugin loaded', location });
          },
        }),
      },
    },
  };
}
