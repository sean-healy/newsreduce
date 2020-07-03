const path = require('path');

module.exports = {
  target: 'node',
  mode: 'production',
  entry: {
      'fetch-worker':    './dist/services/fetcher/worker.js',
      'fetch-zookeeper': './dist/services/fetcher/zookeeper.js',
      'html-process':    './dist/html-processor/process.js',
  },
  externals: [
      "jsdom",
  ],
  output: {
    path: path.resolve(__dirname, 'bin'),
    filename: 'nr-[name]',
  },
};
