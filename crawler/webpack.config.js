const path = require('path');
const fs = require('fs');
const nodeExternals = require('webpack-node-externals');

const alias = {};
const files = fs.readdirSync(path.join(__dirname, "dist/main"));
const basenames = files
	.filter(file => !file.match(/\.ts$/))
	.map(file => file.replace(/\..*$/, ""));
basenames.forEach(basename => {
	alias[basename] = path.join(__dirname, `dist/main/${basename}`);
});
console.log(alias);

module.exports = {
  target: 'node',
  mode: 'production',
  entry: {
      'fetch-worker':           './dist/main/services/fetcher/worker.js',
      'fetch-zookeeper':        './dist/main/services/fetcher/zookeeper.js',
      'html-process-worker':    './dist/main/services/html-processor/worker.js',
      'html-process-zookeeper': './dist/main/services/html-processor/zookeeper.js',
      'schedule':               './dist/main/services/scheduler.js',
      'main-net':               './dist/main/services/net-agent/for-main.js',
      'worker-net':             './dist/main/services/net-agent/for-worker.js',
      'cold-start':             './dist/main/services/cold-start/main.js',
      'inserter':               './dist/main/services/inserter/main.js',
      'compressor':             './dist/main/services/compressor/main.js',
  },
  externals: [
      //"jsdom",
      //"express",
      nodeExternals(),
  ],
  output: {
    path: path.resolve(__dirname, 'bin'),
    filename: 'nr-[name]',
  },
  resolve: {
    alias,
  }
};
