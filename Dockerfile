FROM node:alpine

WORKDIR /build

COPY webpack.config.ts tsconfig.json tsconfig.build.json /build/
COPY package.json package-lock.json /build/
COPY packages /build/packages

RUN npm ci --no-optional --ignore-scripts
RUN npm run webpack-bundle

FROM node:alpine

WORKDIR /spec
COPY --from=0 /build/dist/bundle.js /bin/openapi-cli

ENTRYPOINT [ "node", "/bin/openapi-cli"]
