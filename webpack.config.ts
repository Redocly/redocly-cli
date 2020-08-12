const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './src/cli.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.node$/,
        loader: 'node-loader',
      },
      {
        test: path.resolve(__dirname, 'node_modules/simple-websocket/server.js'),
        use: 'null-loader',
      },
    ],
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
  },
  
  node: {
    __dirname: false,
    fs: 'empty',
  },

  plugins: [
    new webpack.BannerPlugin({ banner: "#!/usr/bin/env node", raw: true }),
  ],

  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  
  target: 'node',
};