const path = require('path');

module.exports = {
  target: 'node',
  mode: 'production',
  entry: {
      'fetch-worker':    './dist/services/fetcher/worker.js',
      'fetch-zookeeper': './dist/services/fetcher/zookeeper.js',
      'html-process':    './dist/html-processor/process.js',
      'schedule':        './dist/services/scheduler.js',
      'main-net':        './dist/services/net-agent/for-main.js',
      'worker-net':      './dist/services/net-agent/for-worker.js',
  },
  externals: [
      "jsdom",
  ],
  output: {
    path: path.resolve(__dirname, 'bin'),
    filename: 'nr-[name]',
  },
};
