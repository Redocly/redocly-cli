export default function themePlugin() {
  return {
    id: 'theme-plugin',
    rules: {
      oas3: {
        marker: () => ({
          Info(_info, { report, location }) {
            report({ message: 'theme-plugin loaded', location });
          },
        }),
      },
    },
  };
}
