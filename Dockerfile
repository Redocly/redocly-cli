FROM node:alpine

WORKDIR /build
COPY . .
RUN apk add --no-cache jq git && \
    pnpm ci --no-optional --ignore-scripts && \
    pnpm run prepare && \
    pnpm run pack:prepare && \
    pnpm install --global redocly-cli.tgz && \
    cp packages/cli/src/commands/build-docs/template.hbs \
       /usr/local/lib/node_modules/@redocly/cli/lib/commands/build-docs/ && \
    # Clean up to reduce image size
    pnpm cache clean --force && rm -rf /build

WORKDIR /spec
ENTRYPOINT ["redocly"]
ENV REDOCLY_ENVIRONMENT=docker
