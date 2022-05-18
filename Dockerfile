FROM node:alpine

WORKDIR /build

# Copy files required for npm install only
COPY package.json package-lock.json /build/
COPY packages/cli/package.json /build/packages/cli/
COPY packages/core/package.json   /build/packages/core/
COPY packages/cli/bin/ /build/packages/cli/bin/

RUN npm ci --no-optional --ignore-scripts

# Copy rest of the files
COPY . /build/
RUN npm run prepare

# Install redocly-cli globally, similar to npm install --global @redocly/cli
# but the local package is used here
RUN mv -- "$(npm pack packages/cli/)" redocly-cli.tgz && \
	  npm install --global redocly-cli.tgz

# npm pack in the previous RUN command does not include these assets
RUN cp packages/cli/src/commands/preview-docs/preview-server/default.hbs /usr/local/lib/node_modules/@redocly/cli/lib/commands/preview-docs/preview-server/default.hbs && \
	  cp packages/cli/src/commands/preview-docs/preview-server/hot.js /usr/local/lib/node_modules/@redocly/cli/lib/commands/preview-docs/preview-server/hot.js

# Clean up to reduce image size
RUN npm cache clean --force && rm -rf /build

WORKDIR /spec

ENTRYPOINT [ "openapi" ]
