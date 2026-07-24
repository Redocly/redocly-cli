import SetServersUrls from './set-servers-urls-decorator.js';

/** @type {import('@redocly/cli').DecoratorsConfig} */
const setServersUrlsDecorator = {
  oas3: {
    'set-servers-urls-decorator': SetServersUrls,
  },
};

export default function setServersUrlsPlugin() {
  return {
    id: 'set-servers-urls-plugin',
    decorators: setServersUrlsDecorator,
  };
}
