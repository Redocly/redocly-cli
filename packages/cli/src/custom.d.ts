type GenericObject = Record<string, any>;

declare module 'redoc/bundle/redoc.server.js' {
  export { convertSwagger2OpenAPI, createStandaloneServerApp } from 'redoc';
  export { ServerStyleSheet } from 'styled-components';
}
