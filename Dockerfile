FROM node:alpine

WORKDIR /build

COPY tsconfig.json tsconfig.build.json /build/
COPY package.json package-lock.json /build/
COPY packages /build/packages

RUN npm ci --no-optional

# Install openapi-cli globally, similar to npm install --global @redocly/openapi-cli
# but the local package is used here
RUN mv -- "$(npm pack packages/cli/)" redocly-openapi-cli.tgz && \
	npm install --global redocly-openapi-cli.tgz

# npm pack in the previous RUN command does not include these assets
RUN cp packages/cli/src/commands/preview-docs/preview-server/default.hbs /usr/local/lib/node_modules/@redocly/openapi-cli/lib/commands/preview-docs/preview-server/default.hbs && \
	cp packages/cli/src/commands/preview-docs/preview-server/hot.js /usr/local/lib/node_modules/@redocly/openapi-cli/lib/commands/preview-docs/preview-server/hot.js

# Clean up to reduce image size
RUN npm cache clean --force && rm -rf /build

WORKDIR /spec

ENTRYPOINT [ "openapi" ]
