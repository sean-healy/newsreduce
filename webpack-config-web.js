const path = require('path');
const fs = require('fs');
const alias = {};
const dir = [__dirname, "src", "main", "ts"];
const files = fs.readdirSync(path.join(...dir));
const basenames = files.map(file => file.replace(/\..*$/, ""));
basenames.forEach(basename => alias[basename] = path.join(...dir, basename));
console.log(alias);

module.exports = {
  target: 'web',
  mode: 'development',
  devtool: "inline-source-map",
  module: {
      rules: [
          {
              test: /\.tsx?$/,
              use: "ts-loader",
              exclude: /node_modules/,
          },
      ],
  },
  entry: {
    'resource-version-browser':  './src/main/ts/web-apps/resource-version-browser/index.tsx',
    'host-version-browser':      './src/main/ts/web-apps/host-version-browser/index.tsx',
    'predicate-version-browser': './src/main/ts/web-apps/predicate-version-browser/index.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'nr-[name].js',
  },
  resolve: {
    alias,
    extensions: [ ".tsx", ".ts", ".js" ],
  },
};
