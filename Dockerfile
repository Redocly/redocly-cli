FROM node:alpine

WORKDIR /build
COPY . .
RUN apk add --no-cache jq git curl bash unzip && \
    BUN_INSTALL=/usr/local bash -lc "curl -fsSL https://bun.sh/install | bash" && \
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
