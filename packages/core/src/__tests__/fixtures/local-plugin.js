export default function localPlugin() {
  return {
    id: 'local',
    configs: {
      all: {},
    },
    assertions: {
      checkWordsCount: () => false,
    },
  };
}
