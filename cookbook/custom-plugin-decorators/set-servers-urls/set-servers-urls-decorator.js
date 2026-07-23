/** @type {import('@redocly/cli').OasDecorator} */
export default function SetServersUrls({ serverUrl = [] }) {
  return {
    Root: {
      leave(node) {
        const serverUrlsIsAValidArray = Array.isArray(serverUrl) && serverUrl.length > 0;

        if (!serverUrlsIsAValidArray) {
          return;
        }

        node.servers = serverUrl.map((url) => ({ url }));
      },
    },
  };
}
