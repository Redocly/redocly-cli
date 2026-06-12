FROM node:24-alpine

WORKDIR /build
COPY . .
RUN apk add --no-cache jq git && \
    npm ci --ignore-scripts && \
    npm run prepare && \
    npm run pack:prepare && \
    npm install --global redocly-cli.tgz && \
    # Clean up to reduce image size
    npm cache clean --force && rm -rf /build

WORKDIR /spec
ENTRYPOINT ["redocly"]
ENV REDOCLY_ENVIRONMENT=docker
