const path = require('path');
const fs = require('fs');
const nodeExternals = require('webpack-node-externals');

const alias = {};
const dir = [__dirname, "src", "main", "ts"];
const files = fs.readdirSync(path.join(...dir));
const basenames = files.map(file => file.replace(/\..*$/, ""));
basenames.forEach(basename => alias[basename] = path.join(...dir, basename));
console.log(alias);

module.exports = {
  target: 'node',
  mode: 'production',
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
    'fetch-worker':               './src/main/ts/services/fetcher/worker.ts',
    'fetch-zookeeper':            './src/main/ts/services/fetcher/zookeeper.ts',
    'resource-process-worker':    './src/main/ts/services/resource-processor/worker.ts',
    'resource-process-zookeeper': './src/main/ts/services/resource-processor/zookeeper.ts',
    'schedule':                   './src/main/ts/services/scheduler.ts',
    'main-net':                   './src/main/ts/services/net-agent/for-main.ts',
    'worker-net':                 './src/main/ts/services/net-agent/for-worker.ts',
    'cold-start':                 './src/main/ts/services/cold-start/main.ts',
    'inserter':                   './src/main/ts/services/inserter/main.ts',
    'compressor':                 './src/main/ts/services/compressor/main.ts',
    'bulk-processors':            './src/main/ts/services/bulk-processors/main.ts',
    'bulk-processors':            './src/main/ts/services/bulk-processors/main.ts',
    'version-browser':            './src/main/ts/web-apps/version-browser/index.tsx',
  },
  externals: [nodeExternals()],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'nr-[name].js',
  },
  resolve: {
    alias,
    extensions: [ ".tsx", ".ts", ".js" ],
  },
};
