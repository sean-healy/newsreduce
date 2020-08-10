const path = require('path');
const fs = require('fs');
const nodeExternals = require('webpack-node-externals');

const alias = {};
const dir = [__dirname, "src", "main", "ts"];
const files = fs.readdirSync(path.join(...dir));
const basenames = files.map(file => file.replace(/\..*$/, ""));
basenames.forEach(basename => alias[basename] = path.join(...dir, basename));
console.log(alias);

const externals = [nodeExternals()];
console.log(externals);

module.exports = {
  target: 'node',
  mode: 'production',
  module: {
      rules: [
          {
              test: /\.ts$/,
              use: "ts-loader",
              exclude: /node_modules/,
          },
      ],
  },
  entry: {
    'fetcher-worker':               './src/main/ts/services/fetcher/worker.ts',
    'fetcher-zookeeper':            './src/main/ts/services/fetcher/zookeeper.ts',
    'resource-processor-worker':    './src/main/ts/services/resource-processor/worker.ts',
    'resource-processor-zookeeper': './src/main/ts/services/resource-processor/zookeeper.ts',
    'scheduler':                    './src/main/ts/services/scheduler.ts',
    'main-net-agent':               './src/main/ts/services/net-agent/forMain.ts',
    'worker-net-agent':             './src/main/ts/services/net-agent/forWorker.ts',
    'cold-start':                   './src/main/ts/services/cold-start/main.ts',
    'inserter':                     './src/main/ts/services/inserter/main.ts',
    'compressor':                   './src/main/ts/services/compressor/main.ts',
    'process-word-vectors':         './src/main/ts/services/bulk-processors/processWordVectors.ts',
    'process-bows-per-host':        './src/main/ts/services/bulk-processors/processBagsOfWordsPerHost.ts',
    'process-bows-per-relation':    './src/main/ts/services/bulk-processors/processBagsOfWordsPerRelation.ts',
    'process-resource-vectors':     './src/main/ts/services/bulk-processors/processResourceVectors.ts',
    'page-rank':                    './src/main/ts/services/bulk-processors/pageRank.ts',
    'count-words':                  './src/main/ts/services/bulk-processors/countWords.ts',
    'compare-bags':                 './src/main/ts/services/bulk-processors/compareBags.ts',
    'sandbox':                      './src/main/ts/sandbox.ts',
  },
  externals,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'nr-[name].js',
  },
  resolve: {
    alias,
    extensions: [ ".ts", ".js" ],
  },
};
