# Pin to a specific Node.js major so the image doesn't drift onto a Node
# release whose internal `undici` is incompatible with the `undici@6.x`
# dispatcher we ship. Node 26+ uses the new Dispatcher.Handler interface,
# which causes `redocly push` to fail with
# `UND_ERR_INVALID_ARG: invalid onError method`. Node 24's internal undici
# v7 still keeps the legacy handler methods, so the bundled v6 dispatcher
# and the runtime's `fetch` stay compatible.
FROM node:24-alpine

WORKDIR /build
COPY . .
RUN apk add --no-cache jq git && \
    npm ci --no-optional --ignore-scripts && \
    npm run prepare && \
    npm run pack:prepare && \
    npm install --global redocly-cli.tgz && \
    cp packages/cli/src/commands/build-docs/template.hbs \
       /usr/local/lib/node_modules/@redocly/cli/lib/commands/build-docs/ && \
    # Clean up to reduce image size
    npm cache clean --force && rm -rf /build

WORKDIR /spec
ENTRYPOINT ["redocly"]
ENV REDOCLY_ENVIRONMENT=docker
