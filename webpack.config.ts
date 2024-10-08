const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './packages/cli/src/index.ts',
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
          },
        ],
        exclude: /node_modules/,
      },
      {
        // we use bundling for online processing only, so no need for websockets
        // which are used only in preview-docs command.
        // on the other hand it was impossible to bundle this lib into a package
        test: path.resolve(__dirname, 'node_modules/simple-websocket/server.js'),
        use: 'null-loader',
      },
      {
        test: path.resolve(__dirname, 'node_modules/fsevents/fsevents.node'),
        use: 'null-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    mainFields: ['main'],
    fallback: {
      fs: false,
    },
    alias: {
      undici: process.env.BROWSER ? false : 'undici', // Replace 'undici' with false in browser builds
    },
  },

  node: {
    __dirname: false,
  },

  plugins: [new webpack.BannerPlugin({ banner: '#!/usr/bin/env node', raw: true })],

  optimization: {
    splitChunks: {
      minChunks: Infinity,
    },
  },

  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },

  target: 'node',
};
