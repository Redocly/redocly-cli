FROM node:alpine

WORKDIR /build

RUN npm i -g pnpm@10

COPY . .

RUN apk add --no-cache jq git && \
    pnpm i --frozen-lockfile --no-optional --ignore-scripts && \
    pnpm run prepare && \
    pnpm run pack:prepare && \
    npm install --global redocly-cli.tgz && \
    cp packages/cli/src/commands/build-docs/template.hbs \
       /usr/local/lib/node_modules/@redocly/cli/lib/commands/build-docs/ && \
    # Clean up to reduce image size
    pnpm store prune && rm -rf /build

WORKDIR /spec
ENTRYPOINT ["redocly"]
ENV REDOCLY_ENVIRONMENT=docker
