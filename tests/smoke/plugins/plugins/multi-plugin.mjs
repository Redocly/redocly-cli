export default function multiPlugin() {
  return [
    {
      id: 'multi-plugin-first',
      rules: {
        oas3: {
          marker: () => ({
            Info(_info, { report, location }) {
              report({ message: 'multi-plugin-first loaded', location });
            },
          }),
        },
      },
    },
    {
      id: 'multi-plugin-second',
      rules: {
        oas3: {
          marker: () => ({
            Info(_info, { report, location }) {
              report({ message: 'multi-plugin-second loaded', location });
            },
          }),
        },
      },
    },
  ];
}
