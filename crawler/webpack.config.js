const path = require('path');
const fs = require('fs');

const alias = {};
const files = fs.readdirSync(path.join(__dirname, "dist/src"));
const basenames = files
	.filter(file => !file.match(/\.ts$/))
	.map(file => file.replace(/\..*$/, ""));
basenames.forEach(basename => {
	alias[basename] = path.join(__dirname, `dist/src/${basename}`);
});
console.log(alias);

module.exports = {
  target: 'node',
  mode: 'production',
  entry: {
      'fetch-worker':    './dist/src/services/fetcher/worker.js',
      'fetch-zookeeper': './dist/src/services/fetcher/zookeeper.js',
      'html-process':    './dist/src/services/html-processor/main.js',
      'schedule':        './dist/src/services/scheduler.js',
      'main-net':        './dist/src/services/net-agent/for-main.js',
      'worker-net':      './dist/src/services/net-agent/for-worker.js',
      'cold-start':      './dist/src/services/cold-start/main.js',
      'inserter':        './dist/src/services/inserter/main.js',
  },
  externals: [
      "jsdom",
      "express",
  ],
  output: {
    path: path.resolve(__dirname, 'bin'),
    filename: 'nr-[name]',
  },
  resolve: {
    alias,
  }
};
